import { describe, it, expect } from 'vitest';
import { fromYaml, ElucimYamlError } from '../yaml/fromYaml';

const validYaml = `
version: "1.0"
root:
  type: player
  preset: card
  durationInFrames: 60
  children:
    - type: circle
      cx: 250
      cy: 175
      r: 80
      stroke: "$accent"
      strokeWidth: 3
      fill: none
`;

const validSceneYaml = `
version: "1.0"
root:
  type: scene
  durationInFrames: 120
  children:
    - type: text
      content: Hello World
      x: 200
      y: 100
      fill: "$foreground"
      fontSize: 24
`;

describe('fromYaml', () => {
  it('parses valid YAML into ElucimDocument', () => {
    const doc = fromYaml(validYaml);
    expect(doc.version).toBe('1.0');
    expect(doc.root.type).toBe('player');
    expect((doc.root as any).children).toHaveLength(1);
    expect((doc.root as any).children[0].type).toBe('circle');
  });

  it('parses scene type', () => {
    const doc = fromYaml(validSceneYaml);
    expect(doc.root.type).toBe('scene');
    expect((doc.root as any).durationInFrames).toBe(120);
  });

  it('preserves $token strings without coercion', () => {
    const doc = fromYaml(validYaml);
    const circle = (doc.root as any).children[0];
    expect(circle.stroke).toBe('$accent');
  });

  it('throws ElucimYamlError on invalid YAML syntax', () => {
    expect(() => fromYaml('  bad:\nyaml: [unclosed')).toThrow(ElucimYamlError);
  });

  it('throws ElucimYamlError on non-object input', () => {
    expect(() => fromYaml('just a string')).toThrow(ElucimYamlError);
    expect(() => fromYaml('42')).toThrow(ElucimYamlError);
  });

  it('throws ElucimYamlError when version is missing', () => {
    const yaml = `
root:
  type: player
  durationInFrames: 60
  children: []
`;
    expect(() => fromYaml(yaml)).toThrow(ElucimYamlError);
  });

  it('throws ElucimYamlError when root is missing', () => {
    const yaml = `
version: "1.0"
`;
    expect(() => fromYaml(yaml)).toThrow(ElucimYamlError);
  });

  it('includes validation errors in the error object', () => {
    const yaml = `
version: "1.0"
root:
  type: player
  children: []
`;
    try {
      fromYaml(yaml);
      expect.fail('Should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ElucimYamlError);
      expect((e as ElucimYamlError).validationErrors.length).toBeGreaterThan(0);
    }
  });

  it('does not coerce YAML-specific booleans (JSON schema)', () => {
    // "on" and "yes" should stay as strings with JSON_SCHEMA
    const yaml = `
version: "1.0"
root:
  type: player
  preset: card
  durationInFrames: 60
  children:
    - type: text
      content: "on"
      x: 100
      y: 100
`;
    const doc = fromYaml(yaml);
    const text = (doc.root as any).children[0];
    expect(text.content).toBe('on');
    expect(typeof text.content).toBe('string');
  });

  it('handles nested sequences and groups', () => {
    const yaml = `
version: "1.0"
root:
  type: player
  preset: card
  durationInFrames: 120
  children:
    - type: sequence
      from: 0
      durationInFrames: 60
      children:
        - type: fadeIn
          duration: 20
          children:
            - type: circle
              cx: 200
              cy: 200
              r: 50
`;
    const doc = fromYaml(yaml);
    const seq = (doc.root as any).children[0];
    expect(seq.type).toBe('sequence');
    expect(seq.children[0].type).toBe('fadeIn');
    expect(seq.children[0].children[0].type).toBe('circle');
  });
});
