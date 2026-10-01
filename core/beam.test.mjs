import test from 'node:test';
import assert from 'node:assert/strict';
import { Beam } from './beam.js';
import { LightSource, OpticalSystem } from './components.js';

test('FFT intensity display centers the spectrum', () => {
  const beam = new Beam(4, 4, 1, 1, 632.8e-9);
  beam.real.fill(0);
  beam.imaginary.fill(0);
  beam.real[0] = 1;

  const transformed = beam.clone();
  transformed.swapQuadrants();
  transformed.fourierTransform(true);
  transformed.swapQuadrants();

  const maximum = transformed.maxIntensity();
  const centreIndex = transformed.index(2, 2);

  assert.ok(maximum > 0);
  assert.ok(transformed.intensityAt(2, 2) >= transformed.intensityAt(0, 0));
  assert.ok(transformed.intensityAt(2, 2) >= transformed.intensityAt(1, 0));
  assert.ok(centreIndex >= 0);
});

test('an optical system starts dark and light sources add at their chain position', () => {
  const initialBeam = new Beam(4, 4, 1, 1, 632.8e-9);
  assert.equal(initialBeam.maxIntensity(), 0);

  initialBeam.makeUniformPlaneWave().scale(0.5);
  const system = new OpticalSystem([
    { apply: beam => beam },
    new LightSource({ type: 'uniform' }),
    { apply: beam => beam.scale(2) }
  ], initialBeam);

  const output = system.run();
  assert.equal(output.real[0], 3);
  assert.ok(Math.abs(output.imaginary[0]) < Number.EPSILON);
});

test('light sources contribute independently controlled phase offsets', () => {
  const firstSource = new LightSource({ type: 'uniform', phase: 0 });
  const secondSource = new LightSource({ type: 'uniform', phase: Math.PI / 2 });
  const initialBeam = new Beam(4, 4, 1, 1, 632.8e-9);

  const inQuadrature = new OpticalSystem([firstSource, secondSource], initialBeam).run();
  assert.ok(Math.abs(inQuadrature.real[0] - 1) < Number.EPSILON);
  assert.ok(Math.abs(inQuadrature.imaginary[0] - 1) < Number.EPSILON);

  secondSource.phase = Math.PI;
  const cancelled = new OpticalSystem([firstSource, secondSource], initialBeam).run();
  assert.ok(Math.abs(cancelled.real[0]) < Number.EPSILON);
  assert.ok(Math.abs(cancelled.imaginary[0]) < Number.EPSILON);
});

test('light source centres position profiles and plane-wave phase origins', () => {
  const options = { width: 8, height: 8, physicalWidth: 8, physicalHeight: 8, wavelength: 632.8e-9 };
  const gaussian = new LightSource({ type: 'gaussian', waist: 0.5, xCentre: 1.5, yCentre: -0.5 }).output(options);
  assert.ok(gaussian.intensityAt(5, 3) > gaussian.intensityAt(3, 3));

  const bitmapData = new Float64Array(64);
  bitmapData[3 * 8 + 3] = 1;
  const bitmap = new LightSource({ type: 'bitmap', bitmapData, xCentre: 1, yCentre: -1 }).output(options);
  assert.equal(bitmap.intensityAt(4, 2), 1);
  assert.equal(bitmap.intensityAt(3, 3), 0);

  const planeWave = new LightSource({ type: 'uniform', xWaveNumber: 1, xCentre: 1.5 }).output(options);
  assert.ok(Math.abs(planeWave.real[3 * 8 + 5] - 1) < Number.EPSILON);
  assert.ok(Math.abs(planeWave.imaginary[3 * 8 + 5]) < Number.EPSILON);
});
