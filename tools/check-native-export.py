"""Compare a manually exported Blockbench GLB with its runtime model.

Requires Pillow. This reads artifacts only; it does not automate the editor.
Usage: python tools/check-native-export.py npc reports/blockbench/npc-native-palette.glb
"""
import base64
import hashlib
import io
import json
import math
from pathlib import Path
import struct
import sys
from PIL import Image


def glb(path):
    data = Path(path).read_bytes()
    assert data[:4] == b"glTF" and struct.unpack_from("<I", data, 4)[0] == 2
    length = struct.unpack_from("<I", data, 12)[0]
    document = json.loads(data[20:20 + length])
    return document, data[28 + length:]


def accessor(document, binary, index):
    item = document["accessors"][index]
    view = document["bufferViews"][item["bufferView"]]
    assert item["componentType"] == 5126, "Expected uncompressed float accessor"
    count = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}[item["type"]]
    start = view.get("byteOffset", 0) + item.get("byteOffset", 0)
    stride = view.get("byteStride", count * 4)
    return [struct.unpack_from("<" + "f" * count, binary, start + n * stride)
            for n in range(item["count"])]


def meshes(document):
    parents = {child: parent for parent, node in enumerate(document["nodes"])
               for child in node.get("children", [])}
    result = {}
    for index, node in enumerate(document["nodes"]):
        if "mesh" not in node:
            continue
        name = node.get("name") or document["nodes"][parents[index]]["name"]
        translation = [0.0, 0.0, 0.0]
        ancestor = index
        while True:
            transform = document["nodes"][ancestor]
            assert transform.get("rotation", [0, 0, 0, 1]) == [0, 0, 0, 1]
            assert transform.get("scale", [1, 1, 1]) == [1, 1, 1]
            offset = transform.get("translation", [0, 0, 0])
            if "matrix" in transform:
                matrix = transform["matrix"]
                identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
                assert len(matrix) == 16 and all(matrix[i] == identity[i] for i in range(16) if i not in (12, 13, 14)), "Only pure translation matrices are supported"
                offset = matrix[12:15]
            translation = [a + b for a, b in zip(translation, offset)]
            if ancestor not in parents:
                break
            ancestor = parents[ancestor]
        result[name] = (document["meshes"][node["mesh"]]["primitives"], translation)
    return result


def curves(document, binary):
    result = {}
    for animation in document.get("animations", []):
        for channel in animation["channels"]:
            sampler = animation["samplers"][channel["sampler"]]
            target = channel["target"]
            name = document["nodes"][target["node"]]["name"]
            result[(animation["name"], name, target["path"])] = (
                sampler.get("interpolation", "LINEAR"),
                accessor(document, binary, sampler["input"]),
                accessor(document, binary, sampler["output"]))
    return result


model_id, native_path = sys.argv[1:3]
runtime_path = Path(f"public/assets/models/{model_id}.glb")
source_path = Path(f"assets/source/{model_id}.bbmodel")
native, native_bin = glb(native_path)
runtime, runtime_bin = glb(runtime_path)
source = json.loads(source_path.read_text(encoding="utf-8"))
source_image = Image.open(io.BytesIO(base64.b64decode(source["textures"][0]["source"].split(",")[1]))).convert("RGBA")
image_view = native["bufferViews"][native["images"][0]["bufferView"]]
start = image_view.get("byteOffset", 0)
native_image = Image.open(io.BytesIO(native_bin[start:start + image_view["byteLength"]])).convert("RGBA")
assert native_image.size == source_image.size
assert native_image.tobytes() == source_image.tobytes(), "Export changed palette pixels"
native_meshes, runtime_meshes = meshes(native), meshes(runtime)
assert native_meshes.keys() == runtime_meshes.keys()
vertex_samples, max_bounds_error = 0, 0.0
for name, (parts, translation) in native_meshes.items():
    runtime_parts, runtime_translation = runtime_meshes[name]
    assert len(parts) == len(runtime_parts) == 1
    part, runtime_part = parts[0], runtime_parts[0]
    material = native["materials"][part["material"]]
    texture_index = material["pbrMetallicRoughness"]["baseColorTexture"]["index"]
    assert native["textures"][texture_index]["source"] == 0
    colors = accessor(runtime, runtime_bin, runtime_part["attributes"]["COLOR_0"])
    assert all(color == colors[0] for color in colors), "Requires flat-color runtime primitive"
    def srgb(value):
        return round(255 * (12.92 * value if value <= .0031308 else 1.055 * value ** (1 / 2.4) - .055))
    expected = tuple(srgb(value) for value in colors[0][:3]) + (255,)
    for u, v in accessor(native, native_bin, part["attributes"]["TEXCOORD_0"]):
        width, height = native_image.size
        pixel = native_image.getpixel((min(width - 1, max(0, math.floor(u * width))),
                                       min(height - 1, max(0, math.floor(v * height)))))
        assert pixel == expected, f"{name}: UV samples {pixel}, expected {expected}"
        vertex_samples += 1
    for axis in range(3):
        positions = accessor(native, native_bin, part["attributes"]["POSITION"])
        runtime_positions = accessor(runtime, runtime_bin, runtime_part["attributes"]["POSITION"])
        for bound in (min, max):
            error = abs(bound(p[axis] for p in positions) + translation[axis]
                        - bound(p[axis] for p in runtime_positions) - runtime_translation[axis])
            max_bounds_error = max(max_bounds_error, error)
assert max_bounds_error < 1e-6
native_curves, runtime_curves = curves(native, native_bin), curves(runtime, runtime_bin)
assert native_curves.keys() == runtime_curves.keys()
max_curve_error = 0.0
for key, (interpolation, times, values) in native_curves.items():
    other_interpolation, other_times, other_values = runtime_curves[key]
    assert interpolation == other_interpolation and times == other_times
    assert len(values) == len(other_values)
    for row, other in zip(values, other_values):
        max_curve_error = max(max_curve_error, max(abs(a - b) for a, b in zip(row, other)))
assert max_curve_error < 1e-6
report = {"model": model_id, "nativeFile": str(native_path),
          "nativeSha256": hashlib.sha256(Path(native_path).read_bytes()).hexdigest(),
          "runtimeSha256": hashlib.sha256(runtime_path.read_bytes()).hexdigest(),
          "sourceSha256": hashlib.sha256(source_path.read_bytes()).hexdigest(),
          "textureSize": native_image.size, "palettePixelsIdentical": True,
          "uvVertexColorSamples": vertex_samples, "meshCount": len(native_meshes),
          "maxBoundsErrorMetres": max_bounds_error,
          "animationTracks": len(native_curves), "maxCurveComponentError": max_curve_error,
          "passed": True,
          "unverified": ["browser lighting/material shading parity", "moving-view mip filtering"]}
Path(f"reports/blockbench/{model_id}-palette-roundtrip.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report, indent=2))
