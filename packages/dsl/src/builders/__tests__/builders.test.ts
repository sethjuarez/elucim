import { describe, it, expect } from 'vitest';
import { presentation } from '../PresentationBuilder';
import { SlideBuilder } from '../SlideBuilder';
import { darkTheme, lightTheme } from '../themes';
import { validate } from '../../validator/validate';
import type { ElucimDocument, PresentationNode, SlideNode, ElementNode } from '../../schema/types';

describe('DSL Builder API', () => {
  describe('presentation() factory', () => {
    it('should create a presentation with default theme', () => {
      const doc = presentation('My Talk').build();
      expect(doc).toBeDefined();
      expect(doc.version).toBe('1.0');
      expect(doc.root.type).toBe('presentation');
    });

    it('should create a presentation with darkTheme', () => {
      const doc = presentation('Dark Talk', darkTheme).build();
      const root = doc.root as PresentationNode;
      expect(root.background).toBe('#0a0a1e');
    });

    it('should create a presentation with lightTheme', () => {
      const doc = presentation('Light Talk', lightTheme).build();
      const root = doc.root as PresentationNode;
      expect(root.background).toBe('#f8fafc');
    });

    it('should apply custom presentation options', () => {
      const doc = presentation('My Talk', darkTheme, {
        width: 1280,
        height: 720,
        fps: 60,
        transition: 'slide-left',
        transitionDuration: 20,
        showHud: false,
        showNotes: false,
      }).build();

      const root = doc.root as PresentationNode;
      expect(root.width).toBe(1280);
      expect(root.height).toBe(720);
      expect(root.transition).toBe('slide-left');
      expect(root.transitionDuration).toBe(20);
      expect(root.showHud).toBe(false);
      expect(root.showNotes).toBe(false);
    });
  });

  describe('presentation.slide() chaining', () => {
    it('should add a slide with correct title', () => {
      const doc = presentation('Talk')
        .slide('Intro', (s) => {
          s.title('Welcome');
        })
        .build();

      const root = doc.root as PresentationNode;
      expect(root.slides.length).toBe(1);
      expect(root.slides[0].title).toBe('Intro');
    });

    it('should chain multiple slides', () => {
      const doc = presentation('Talk')
        .slide('Intro', (s) => s.title('Welcome'))
        .slide('Details', (s) => s.subtitle('Let\'s dive in'))
        .slide('Conclusion', (s) => s.text('The End', { x: 450, y: 320 }))
        .build();

      const root = doc.root as PresentationNode;
      expect(root.slides.length).toBe(3);
      expect(root.slides[0].title).toBe('Intro');
      expect(root.slides[1].title).toBe('Details');
      expect(root.slides[2].title).toBe('Conclusion');
    });

    it('should add slide with notes and background', () => {
      const doc = presentation('Talk')
        .slide('Intro', (s) => s.title('Welcome'), {
          notes: 'Remember to introduce yourself',
          background: '#1e1e2e',
        })
        .build();

      const root = doc.root as PresentationNode;
      const slide = root.slides[0];
      expect(slide.notes).toBe('Remember to introduce yourself');
      expect(slide.background).toBe('#1e1e2e');
    });
  });

  describe('SlideBuilder.title()', () => {
    it('should add title element at default position', () => {
      const doc = presentation('Talk')
        .slide('Slide', (s) => {
          s.title('Hello World');
        })
        .build();

      const slide = (doc.root as PresentationNode).slides[0];
      const playerChildren = slide.children[0]?.children || [];
      
      // Title creates a sequence with fadeIn containing text
      expect(playerChildren.length).toBeGreaterThan(0);
      
      // Find the text element in the structure
      let foundTitle = false;
      playerChildren.forEach((node: any) => {
        if (node.type === 'sequence' && node.children) {
          node.children.forEach((child: any) => {
            if (child.type === 'fadeIn' && child.children) {
              child.children.forEach((textNode: any) => {
                if (textNode.type === 'text' && textNode.content === 'Hello World') {
                  foundTitle = true;
                }
              });
            }
          });
        }
      });
      expect(foundTitle).toBe(true);
    });

    it('should allow custom title styling', () => {
      const doc = presentation('Talk')
        .slide('Slide', (s) => {
          s.title('Bold Title', { y: 100, fontSize: 36, color: '#ff0000' });
        })
        .build();

      const slide = (doc.root as PresentationNode).slides[0];
      const playerChildren = slide.children[0]?.children || [];
      
      let foundCustomTitle = false;
      playerChildren.forEach((node: any) => {
        if (node.type === 'sequence' && node.children) {
          node.children.forEach((child: any) => {
            if (child.type === 'fadeIn' && child.children) {
              child.children.forEach((textNode: any) => {
                if (
                  textNode.type === 'text' &&
                  textNode.content === 'Bold Title' &&
                  textNode.fontSize === 36 &&
                  textNode.fill === '#ff0000'
                ) {
                  foundCustomTitle = true;
                }
              });
            }
          });
        }
      });
      expect(foundCustomTitle).toBe(true);
    });
  });

  describe('SlideBuilder.subtitle()', () => {
    it('should add subtitle element', () => {
      const doc = presentation('Talk')
        .slide('Slide', (s) => {
          s.subtitle('A Subtitle');
        })
        .build();

      const slide = (doc.root as PresentationNode).slides[0];
      const playerChildren = slide.children[0]?.children || [];
      
      let foundSubtitle = false;
      playerChildren.forEach((node: any) => {
        if (node.type === 'sequence' && node.children) {
          node.children.forEach((child: any) => {
            if (child.type === 'fadeIn' && child.children) {
              child.children.forEach((textNode: any) => {
                if (textNode.type === 'text' && textNode.content === 'A Subtitle') {
                  foundSubtitle = true;
                }
              });
            }
          });
        }
      });
      expect(foundSubtitle).toBe(true);
    });
  });

  describe('SlideBuilder.text()', () => {
    it('should add text at specified position', () => {
      const doc = presentation('Talk')
        .slide('Slide', (s) => {
          s.text('Custom Text', { x: 100, y: 200, fontSize: 18 });
        })
        .build();

      const slide = (doc.root as PresentationNode).slides[0];
      const playerChildren = slide.children[0]?.children || [];
      
      let foundText = false;
      playerChildren.forEach((node: any) => {
        if (node.type === 'sequence' && node.children) {
          node.children.forEach((child: any) => {
            if (child.type === 'fadeIn' && child.children) {
              child.children.forEach((textNode: any) => {
                if (
                  textNode.type === 'text' &&
                  textNode.content === 'Custom Text' &&
                  textNode.x === 100 &&
                  textNode.y === 200
                ) {
                  foundText = true;
                }
              });
            }
          });
        }
      });
      expect(foundText).toBe(true);
    });
  });

  describe('SlideBuilder.latex()', () => {
    it('should add latex expression', () => {
      const doc = presentation('Talk')
        .slide('Slide', (s) => {
          s.latex('e^{i\\pi} + 1 = 0');
        })
        .build();

      const slide = (doc.root as PresentationNode).slides[0];
      const playerChildren = slide.children[0]?.children || [];
      
      let foundLatex = false;
      playerChildren.forEach((node: any) => {
        if (node.type === 'sequence' && node.children) {
          node.children.forEach((child: any) => {
            if (child.type === 'fadeIn' && child.children) {
              child.children.forEach((latexNode: any) => {
                if (latexNode.type === 'latex' && latexNode.expression === 'e^{i\\pi} + 1 = 0') {
                  foundLatex = true;
                }
              });
            }
          });
        }
      });
      expect(foundLatex).toBe(true);
    });

    it('should allow custom latex styling', () => {
      const doc = presentation('Talk')
        .slide('Slide', (s) => {
          s.latex('x^2', { fontSize: 48, color: '#ff6347' });
        })
        .build();

      const slide = (doc.root as PresentationNode).slides[0];
      const playerChildren = slide.children[0]?.children || [];
      
      let foundStyledLatex = false;
      playerChildren.forEach((node: any) => {
        if (node.type === 'sequence' && node.children) {
          node.children.forEach((child: any) => {
            if (child.type === 'fadeIn' && child.children) {
              child.children.forEach((latexNode: any) => {
                if (
                  latexNode.type === 'latex' &&
                  latexNode.fontSize === 48 &&
                  latexNode.color === '#ff6347'
                ) {
                  foundStyledLatex = true;
                }
              });
            }
          });
        }
      });
      expect(foundStyledLatex).toBe(true);
    });
  });

  describe('SlideBuilder.boxRow()', () => {
    it('should return positions array with correct coordinates', () => {
      const builder = new SlideBuilder(darkTheme);
      const positions = builder.boxRow(['A', 'B', 'C']);

      expect(positions.length).toBe(3);
      positions.forEach((pos) => {
        expect(pos).toHaveProperty('x');
        expect(pos).toHaveProperty('y');
        expect(pos).toHaveProperty('w');
        expect(pos).toHaveProperty('h');
        expect(pos).toHaveProperty('cx');
        expect(pos).toHaveProperty('cy');
      });

      // Check that boxes are spaced horizontally
      expect(positions[0].x).toBeLessThan(positions[1].x);
      expect(positions[1].x).toBeLessThan(positions[2].x);
    });

    it('should allow custom dimensions', () => {
      const builder = new SlideBuilder(darkTheme);
      const positions = builder.boxRow(['A', 'B'], {
        boxWidth: 120,
        boxHeight: 60,
        y: 300,
      });

      expect(positions[0].w).toBe(120);
      expect(positions[0].h).toBe(60);
      expect(positions[0].y).toBe(300);
    });

    it('should add box elements to slide', () => {
      const doc = presentation('Talk')
        .slide('Slide', (s) => {
          s.boxRow(['A', 'B']);
        })
        .build();

      const slide = (doc.root as PresentationNode).slides[0];
      const playerChildren = slide.children[0]?.children || [];
      
      let foundBoxes = false;
      playerChildren.forEach((node: any) => {
        if (node.type === 'sequence' && node.children) {
          node.children.forEach((child: any) => {
            if (child.type === 'stagger') {
              foundBoxes = true;
            }
          });
        }
      });
      expect(foundBoxes).toBe(true);
    });
  });

  describe('SlideBuilder.arrow()', () => {
    it('should produce arrow node type', () => {
      const doc = presentation('Talk')
        .slide('Slide', (s) => {
          s.arrow(100, 100, 200, 200);
        })
        .build();

      const slide = (doc.root as PresentationNode).slides[0];
      const playerChildren = slide.children[0]?.children || [];
      
      let foundArrow = false;
      playerChildren.forEach((node: any) => {
        if (node.type === 'sequence' && node.children) {
          node.children.forEach((child: any) => {
            if (child.type === 'arrow') {
              foundArrow = true;
              expect(child.x1).toBe(100);
              expect(child.y1).toBe(100);
              expect(child.x2).toBe(200);
              expect(child.y2).toBe(200);
            }
          });
        }
      });
      expect(foundArrow).toBe(true);
    });

    it('should allow custom arrow styling', () => {
      const doc = presentation('Talk')
        .slide('Slide', (s) => {
          s.arrow(50, 50, 150, 150, {
            color: '#ff0000',
            strokeWidth: 3,
            headSize: 12,
            dashed: true,
          });
        })
        .build();

      const slide = (doc.root as PresentationNode).slides[0];
      const playerChildren = slide.children[0]?.children || [];
      
      let foundStyledArrow = false;
      playerChildren.forEach((node: any) => {
        if (node.type === 'sequence' && node.children) {
          node.children.forEach((child: any) => {
            if (
              child.type === 'arrow' &&
              child.stroke === '#ff0000' &&
              child.strokeWidth === 3 &&
              child.headSize === 12 &&
              child.strokeDasharray === '6 3'
            ) {
              foundStyledArrow = true;
            }
          });
        }
      });
      expect(foundStyledArrow).toBe(true);
    });
  });

  describe('SlideBuilder.rect()', () => {
    it('should produce rect node type', () => {
      const doc = presentation('Talk')
        .slide('Slide', (s) => {
          s.rect(100, 100, 200, 150);
        })
        .build();

      const slide = (doc.root as PresentationNode).slides[0];
      const playerChildren = slide.children[0]?.children || [];
      
      let foundRect = false;
      playerChildren.forEach((node: any) => {
        if (node.type === 'sequence' && node.children) {
          node.children.forEach((child: any) => {
            if (child.type === 'rect') {
              foundRect = true;
              expect(child.x).toBe(100);
              expect(child.y).toBe(100);
              expect(child.width).toBe(200);
              expect(child.height).toBe(150);
            }
          });
        }
      });
      expect(foundRect).toBe(true);
    });

    it('should allow custom rect styling', () => {
      const doc = presentation('Talk')
        .slide('Slide', (s) => {
          s.rect(50, 50, 100, 100, {
            fill: '#ff0000',
            stroke: '#00ff00',
            strokeWidth: 2,
            rx: 12,
          });
        })
        .build();

      const slide = (doc.root as PresentationNode).slides[0];
      const playerChildren = slide.children[0]?.children || [];
      
      let foundStyledRect = false;
      playerChildren.forEach((node: any) => {
        if (node.type === 'sequence' && node.children) {
          node.children.forEach((child: any) => {
            if (
              child.type === 'rect' &&
              child.fill === '#ff0000' &&
              child.stroke === '#00ff00' &&
              child.strokeWidth === 2 &&
              child.rx === 12
            ) {
              foundStyledRect = true;
            }
          });
        }
      });
      expect(foundStyledRect).toBe(true);
    });
  });

  describe('SlideBuilder.line()', () => {
    it('should produce line node type', () => {
      const doc = presentation('Talk')
        .slide('Slide', (s) => {
          s.line(100, 100, 300, 300);
        })
        .build();

      const slide = (doc.root as PresentationNode).slides[0];
      const playerChildren = slide.children[0]?.children || [];
      
      let foundLine = false;
      playerChildren.forEach((node: any) => {
        if (node.type === 'sequence' && node.children) {
          node.children.forEach((child: any) => {
            if (child.type === 'line') {
              foundLine = true;
              expect(child.x1).toBe(100);
              expect(child.y1).toBe(100);
              expect(child.x2).toBe(300);
              expect(child.y2).toBe(300);
            }
          });
        }
      });
      expect(foundLine).toBe(true);
    });
  });

  describe('SlideBuilder.wait()', () => {
    it('should advance the cursor', () => {
      const builder = new SlideBuilder(darkTheme);
      const initialFrame = builder.frame;
      
      builder.wait(30);
      const afterWait = builder.frame;
      
      expect(afterWait).toBe(initialFrame + 30);
    });

    it('should support chaining', () => {
      const builder = new SlideBuilder(darkTheme);
      builder
        .wait(10)
        .wait(20)
        .wait(5);
      
      expect(builder.frame).toBe(35);
    });

    it('should affect timing of subsequent elements', () => {
      const doc = presentation('Talk')
        .slide('Slide', (s) => {
          s.title('First');
          s.wait(60);
          s.title('Second');
        })
        .build();

      const slide = (doc.root as PresentationNode).slides[0];
      expect(slide).toBeDefined();
      // Both elements should be present
      const playerChildren = slide.children[0]?.children || [];
      expect(playerChildren.length).toBeGreaterThan(1);
    });
  });

  describe('SlideBuilder.at()', () => {
    it('should set cursor to absolute frame', () => {
      const builder = new SlideBuilder(darkTheme);
      
      builder.at(100);
      expect(builder.frame).toBe(100);
      
      builder.at(50);
      expect(builder.frame).toBe(50);
    });

    it('should support chaining', () => {
      const builder = new SlideBuilder(darkTheme);
      builder
        .at(50)
        .wait(10);
      
      expect(builder.frame).toBe(60);
    });

    it('should position elements at absolute frames', () => {
      const doc = presentation('Talk')
        .slide('Slide', (s) => {
          s.title('At Frame 0');
          s.at(100);
          s.title('At Frame 100');
        })
        .build();

      const slide = (doc.root as PresentationNode).slides[0];
      const playerChildren = slide.children[0]?.children || [];
      
      const frames: number[] = [];
      playerChildren.forEach((node: any) => {
        if (node.type === 'sequence') {
          frames.push(node.from);
        }
      });
      
      expect(frames.length).toBe(2);
      expect(frames.includes(0)).toBe(true);
      expect(frames.includes(100)).toBe(true);
    });
  });

  describe('SlideBuilder.barChart()', () => {
    it('should produce barChart node type', () => {
      const doc = presentation('Talk')
        .slide('Slide', (s) => {
          s.barChart(
            [
              { label: 'A', value: 10 },
              { label: 'B', value: 20 },
            ],
            {
              x: 100,
              y: 150,
              width: 400,
              height: 300,
            }
          );
        })
        .build();

      const slide = (doc.root as PresentationNode).slides[0];
      const playerChildren = slide.children[0]?.children || [];
      
      let foundBarChart = false;
      playerChildren.forEach((node: any) => {
        if (node.type === 'sequence' && node.children) {
          node.children.forEach((child: any) => {
            if (child.type === 'barChart') {
              foundBarChart = true;
              expect(child.x).toBe(100);
              expect(child.y).toBe(150);
              expect(child.width).toBe(400);
              expect(child.height).toBe(300);
              expect(child.bars.length).toBe(2);
            }
          });
        }
      });
      expect(foundBarChart).toBe(true);
    });

    it('should allow custom bar styling', () => {
      const doc = presentation('Talk')
        .slide('Slide', (s) => {
          s.barChart(
            [
              { label: 'Category', value: 50, color: '#ff0000' },
            ],
            {
              x: 0,
              y: 0,
              width: 300,
              height: 200,
              barColor: '#00ff00',
              maxValue: 100,
              showValues: true,
            }
          );
        })
        .build();

      const slide = (doc.root as PresentationNode).slides[0];
      const playerChildren = slide.children[0]?.children || [];
      
      let foundStyled = false;
      playerChildren.forEach((node: any) => {
        if (node.type === 'sequence' && node.children) {
          node.children.forEach((child: any) => {
            if (child.type === 'barChart' && child.barColor === '#00ff00') {
              foundStyled = true;
            }
          });
        }
      });
      expect(foundStyled).toBe(true);
    });
  });

  describe('SlideBuilder.graph()', () => {
    it('should produce graph node type', () => {
      const doc = presentation('Talk')
        .slide('Slide', (s) => {
          s.graph(
            [
              { id: 'A', x: 100, y: 100, label: 'Node A' },
              { id: 'B', x: 300, y: 100, label: 'Node B' },
            ],
            [
              { from: 'A', to: 'B', directed: true },
            ]
          );
        })
        .build();

      const slide = (doc.root as PresentationNode).slides[0];
      const playerChildren = slide.children[0]?.children || [];
      
      let foundGraph = false;
      playerChildren.forEach((node: any) => {
        if (node.type === 'sequence' && node.children) {
          node.children.forEach((child: any) => {
            if (child.type === 'graph') {
              foundGraph = true;
              expect(child.nodes.length).toBe(2);
              expect(child.edges.length).toBe(1);
              expect(child.edges[0].from).toBe('A');
              expect(child.edges[0].to).toBe('B');
            }
          });
        }
      });
      expect(foundGraph).toBe(true);
    });

    it('should allow custom graph styling', () => {
      const doc = presentation('Talk')
        .slide('Slide', (s) => {
          s.graph(
            [
              { id: 'X', x: 150, y: 150, color: '#ff0000', radius: 20 },
            ],
            [],
            {
              nodeColor: '#00ff00',
              edgeColor: '#0000ff',
              nodeRadius: 25,
            }
          );
        })
        .build();

      const slide = (doc.root as PresentationNode).slides[0];
      const playerChildren = slide.children[0]?.children || [];
      
      let foundStyled = false;
      playerChildren.forEach((node: any) => {
        if (node.type === 'sequence' && node.children) {
          node.children.forEach((child: any) => {
            if (
              child.type === 'graph' &&
              child.nodeColor === '#00ff00' &&
              child.edgeColor === '#0000ff'
            ) {
              foundStyled = true;
            }
          });
        }
      });
      expect(foundStyled).toBe(true);
    });
  });

  describe('Complete presentation validation', () => {
    it('should produce valid ElucimDocument structure', () => {
      const doc = presentation('Test Talk', darkTheme)
        .slide('Intro', (s) => {
          s.title('Welcome');
          s.subtitle('To the DSL');
        })
        .slide('Content', (s) => {
          s.text('Some content', { x: 450, y: 320 });
          s.latex('f(x) = x^2');
        })
        .build();

      expect(doc.version).toBe('1.0');
      expect(doc.root).toBeDefined();
      expect(doc.root.type).toBe('presentation');
    });

    it('should validate with the validator', () => {
      const doc = presentation('Valid Doc', darkTheme)
        .slide('Slide 1', (s) => {
          s.title('Hello');
        })
        .build();

      const result = validate(doc);
      expect(result.valid).toBe(true);
      if (!result.valid) {
        console.error('Validation errors:', result.errors);
      }
    });

    it('should produce complex presentation that validates', () => {
      const doc = presentation('Complex', darkTheme, {
        width: 1000,
        height: 700,
        fps: 60,
      })
        .slide('Intro', (s) => {
          s.title('Introduction');
          s.subtitle('A detailed walkthrough');
          s.wait(30);
          s.text('Press space to continue', { x: 500, y: 650, fontSize: 12 });
        })
        .slide('Diagram', (s) => {
          const boxes = s.boxRow(['Input', 'Process', 'Output'], { y: 250 });
          s.arrow(boxes[0].cx, boxes[0].cy + 30, boxes[1].cx - 30, boxes[1].cy - 10);
          s.arrow(boxes[1].cx + 30, boxes[1].cy - 10, boxes[2].cx - 30, boxes[2].cy - 10);
        })
        .slide('Math', (s) => {
          s.latex('\\int_a^b f(x) dx', { fontSize: 36, x: 500, y: 300 });
        })
        .slide('Chart', (s) => {
          s.barChart(
            [
              { label: '2020', value: 10 },
              { label: '2021', value: 25 },
              { label: '2022', value: 40 },
            ],
            { x: 150, y: 200, width: 700, height: 300, showValues: true }
          );
        })
        .slide('Network', (s) => {
          s.graph(
            [
              { id: 'center', x: 450, y: 250, label: 'Hub', radius: 25 },
              { id: 'a', x: 250, y: 150, label: 'A' },
              { id: 'b', x: 650, y: 150, label: 'B' },
              { id: 'c', x: 450, y: 450, label: 'C' },
            ],
            [
              { from: 'center', to: 'a' },
              { from: 'center', to: 'b' },
              { from: 'center', to: 'c' },
            ]
          );
        })
        .build();

      const result = validate(doc);
      expect(result.valid).toBe(true);
      if (!result.valid) {
        console.error('Validation errors:', result.errors);
      }

      // Also verify structure
      const root = doc.root as PresentationNode;
      expect(root.slides.length).toBe(5);
      expect(root.width).toBe(1000);
      expect(root.height).toBe(700);
    });

    it('should support fluent chaining with all element types', () => {
      const doc = presentation('Fluent API', lightTheme)
        .slide('Mixed', (s) => {
          s.title('All Together')
            .subtitle('Fluent Chaining')
            .wait(10)
            .text('Some text', { x: 300, y: 200 })
            .latex('x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}', { fontSize: 24 })
            .wait(15)
            .rect(100, 400, 200, 100)
            .arrow(150, 400, 150, 350)
            .line(200, 400, 200, 350);
        })
        .build();

      const result = validate(doc);
      expect(result.valid).toBe(true);
    });
  });

  describe('SlideBuilder properties', () => {
    it('should expose theme, width, height, and fps', () => {
      const builder = new SlideBuilder(darkTheme, 30, 1000, 600);
      expect(builder.theme).toBe(darkTheme);
      expect(builder.fps).toBe(30);
      expect(builder.width).toBe(1000);
      expect(builder.height).toBe(600);
    });

    it('should calculate center coordinates', () => {
      const builder = new SlideBuilder(darkTheme, 30, 900, 640);
      expect(builder.cx).toBe(450);
      expect(builder.cy).toBe(320);
    });

    it('should support default fps and dimensions', () => {
      const builder = new SlideBuilder(darkTheme);
      expect(builder.fps).toBe(30);
      expect(builder.width).toBe(900);
      expect(builder.height).toBe(640);
    });
  });

  describe('Edge cases and special scenarios', () => {
    it('should handle empty presentation', () => {
      const doc = presentation('Empty').build();
      const root = doc.root as PresentationNode;
      expect(root.slides.length).toBe(0);
      
      const result = validate(doc);
      expect(result.valid).toBe(true);
    });

    it('should handle slide with no elements', () => {
      const doc = presentation('Talk')
        .slide('Empty Slide', (s) => {
          // No elements added
        })
        .build();

      const result = validate(doc);
      expect(result.valid).toBe(true);
    });

    it('should handle multiple consecutive waits', () => {
      const builder = new SlideBuilder(darkTheme);
      builder.wait(10).wait(20).wait(5);
      expect(builder.frame).toBe(35);
    });

    it('should handle at() followed by wait()', () => {
      const builder = new SlideBuilder(darkTheme);
      builder.at(50).wait(30);
      expect(builder.frame).toBe(80);
    });

    it('should handle boxRow with various label counts', () => {
      const builder = new SlideBuilder(darkTheme);
      
      const single = builder.boxRow(['One']);
      expect(single.length).toBe(1);
      
      const builder2 = new SlideBuilder(darkTheme);
      const many = builder2.boxRow(['A', 'B', 'C', 'D', 'E']);
      expect(many.length).toBe(5);
    });

    it('should handle elements with no duration advancing', () => {
      const doc = presentation('Talk')
        .slide('Slide', (s) => {
          s.title('First').title('Second').title('Third');
        })
        .build();

      const root = doc.root as PresentationNode;
      expect(root.slides[0]).toBeDefined();
    });
  });

  describe('Theme usage', () => {
    it('should apply darkTheme colors to elements', () => {
      const doc = presentation('Talk', darkTheme)
        .slide('Slide', (s) => {
          s.title('Title');
        })
        .build();

      const slide = (doc.root as PresentationNode).slides[0];
      const playerChildren = slide.children[0]?.children || [];
      
      let foundThemeColor = false;
      playerChildren.forEach((node: any) => {
        if (node.type === 'sequence' && node.children) {
          node.children.forEach((child: any) => {
            if (child.type === 'fadeIn' && child.children) {
              child.children.forEach((textNode: any) => {
                if (
                  textNode.type === 'text' &&
                  textNode.fill === darkTheme.title
                ) {
                  foundThemeColor = true;
                }
              });
            }
          });
        }
      });
      expect(foundThemeColor).toBe(true);
    });

    it('should apply lightTheme colors to elements', () => {
      const doc = presentation('Talk', lightTheme)
        .slide('Slide', (s) => {
          s.title('Title');
        })
        .build();

      const slide = (doc.root as PresentationNode).slides[0];
      const playerChildren = slide.children[0]?.children || [];
      
      let foundThemeColor = false;
      playerChildren.forEach((node: any) => {
        if (node.type === 'sequence' && node.children) {
          node.children.forEach((child: any) => {
            if (child.type === 'fadeIn' && child.children) {
              child.children.forEach((textNode: any) => {
                if (
                  textNode.type === 'text' &&
                  textNode.fill === lightTheme.title
                ) {
                  foundThemeColor = true;
                }
              });
            }
          });
        }
      });
      expect(foundThemeColor).toBe(true);
    });
  });
});
