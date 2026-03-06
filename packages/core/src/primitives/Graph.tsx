import React from 'react';
import { useAnimation, type AnimationProps } from './animation';
import { withTransform, type SpatialProps, type BaseElementProps } from './transform';

export interface GraphNode {
  id: string;
  x: number;
  y: number;
  label?: string;
  color?: string;
  radius?: number;
}

export interface GraphEdge {
  from: string;
  to: string;
  color?: string;
  directed?: boolean;
  label?: string;
}

export interface GraphProps extends AnimationProps, SpatialProps, BaseElementProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  /** Default node color. Default: '#6c5ce7' */
  nodeColor?: string;
  /** Default node radius. Default: 20 */
  nodeRadius?: number;
  /** Default edge color. Default: '#888' */
  edgeColor?: string;
  /** Edge stroke width. Default: 2 */
  edgeWidth?: number;
  /** Label color. Default: '#fff' */
  labelColor?: string;
  /** Label font size. Default: 14 */
  labelFontSize?: number;
}

/**
 * Graph theory visualization with nodes and edges.
 */
export function Graph({
  nodes,
  edges,
  nodeColor = '#6c5ce7',
  nodeRadius = 20,
  edgeColor = '#888',
  edgeWidth = 2,
  labelColor = '#fff',
  labelFontSize = 14,
  fadeIn,
  fadeOut,
  easing,
  rotation,
  rotationOrigin,
  scale,
  translate,
}: GraphProps) {
  const anim = useAnimation({ fadeIn, fadeOut, easing });

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  const xs = nodes.map((n) => n.x);
  const ys = nodes.map((n) => n.y);
  const defaultOrigin: [number, number] = nodes.length > 0
    ? [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2]
    : [0, 0];

  const el = (
    <g opacity={anim.opacity} data-testid="elucim-graph">
      {/* Edges */}
      {edges.map((edge, i) => {
        const fromNode = nodeMap.get(edge.from);
        const toNode = nodeMap.get(edge.to);
        if (!fromNode || !toNode) return null;

        const dx = toNode.x - fromNode.x;
        const dy = toNode.y - fromNode.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const r1 = fromNode.radius ?? nodeRadius;
        const r2 = toNode.radius ?? nodeRadius;

        // Shorten line to stop at node edges
        const x1 = fromNode.x + (dx / len) * r1;
        const y1 = fromNode.y + (dy / len) * r1;
        const x2 = toNode.x - (dx / len) * r2;
        const y2 = toNode.y - (dy / len) * r2;

        const eColor = edge.color ?? edgeColor;

        return (
          <g key={`edge-${i}`}>
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={eColor}
              strokeWidth={edgeWidth}
            />
            {edge.directed && (
              <ArrowHead x1={x1} y1={y1} x2={x2} y2={y2} color={eColor} size={8} />
            )}
            {edge.label && (
              <text
                x={(x1 + x2) / 2}
                y={(y1 + y2) / 2 - 8}
                fill={eColor}
                fontSize={labelFontSize - 2}
                textAnchor="middle"
                fontFamily="monospace"
              >
                {edge.label}
              </text>
            )}
          </g>
        );
      })}

      {/* Nodes */}
      {nodes.map((node) => {
        const r = node.radius ?? nodeRadius;
        const c = node.color ?? nodeColor;
        return (
          <g key={node.id}>
            <circle
              cx={node.x}
              cy={node.y}
              r={r}
              fill={c}
              stroke="#fff"
              strokeWidth={1.5}
            />
            {node.label && (
              <text
                x={node.x}
                y={node.y + labelFontSize / 3}
                fill={labelColor}
                fontSize={labelFontSize}
                textAnchor="middle"
                fontFamily="sans-serif"
                fontWeight="bold"
              >
                {node.label}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );

  return withTransform(el, { rotation, rotationOrigin, scale, translate }, defaultOrigin);
}

/** Internal arrowhead for directed edges */
function ArrowHead({
  x1, y1, x2, y2, color, size,
}: {
  x1: number; y1: number; x2: number; y2: number; color: string; size: number;
}) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headAngle = Math.PI / 6;
  const p1x = x2 - size * Math.cos(angle - headAngle);
  const p1y = y2 - size * Math.sin(angle - headAngle);
  const p2x = x2 - size * Math.cos(angle + headAngle);
  const p2y = y2 - size * Math.sin(angle + headAngle);

  return (
    <polygon points={`${x2},${y2} ${p1x},${p1y} ${p2x},${p2y}`} fill={color} />
  );
}
