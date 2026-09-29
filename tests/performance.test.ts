import {expect,it} from 'vitest';
import {PerformanceCapture} from '../src/game/performance';
it('retains long frames and ends after 90 sampled seconds, not 90 simulation seconds',()=>{
 const capture=new PerformanceCapture();capture.start();
 for(let i=0;i<89;i++)capture.add({milliseconds:1000,calls:10,triangles:100,tick:i,position:[0,0,i]});
 expect(capture.report().complete).toBe(false);
 capture.add({milliseconds:1500,calls:20,triangles:200,tick:90,position:[0,0,90]});
 const report=capture.report();expect(report.complete).toBe(true);expect(report.maxFrameMs).toBe(1500);
 expect(report.activeSeconds).toBe(90.5);expect(report.peakCalls).toBe(20);expect(capture.active).toBe(false);
});
it('samples the route by elapsed active time at different refresh rates and isolates report arrays',()=>{
 for(const hz of [30,60,144]){
  const capture=new PerformanceCapture();capture.start();
  for(let i=1;i<=hz*3;i++)capture.add({milliseconds:1000/hz,calls:i,triangles:i*12,tick:i,position:[i/hz,0,0]});
  const report=capture.report();
  expect(report.route.length).toBeGreaterThanOrEqual(3);
  expect(report.route.length).toBeLessThanOrEqual(4);
  expect(report.route[1].activeSeconds).toBeGreaterThanOrEqual(1);
  expect(report.route[1].activeSeconds).toBeLessThan(1+2/hz);
  expect(report.frameCalls).toHaveLength(hz*3);expect(report.frameTriangles.at(-1)).toBe(hz*3*12);
  report.route[0].position[0]=999;
  expect(capture.report().route[0].position[0]).not.toBe(999);
  capture.start();expect(capture.report().route).toEqual([]);expect(capture.report().frameCalls).toEqual([]);
 }
});
it('records a long-frame route gap without inventing intermediate observations',()=>{
 const capture=new PerformanceCapture();capture.start();
 capture.add({milliseconds:16,calls:1,triangles:12,tick:1,position:[0,0,0]});
 capture.add({milliseconds:3500,calls:2,triangles:24,tick:2,position:[4,0,0]});
 const report=capture.report();expect(report.route).toHaveLength(2);expect(report.route[1].activeSeconds).toBeCloseTo(3.516);
 expect(report.frameIntervalsMs).toEqual([16,3500]);
});
