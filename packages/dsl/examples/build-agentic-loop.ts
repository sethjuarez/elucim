/**
 * "From Words to Agents" — a 12-slide animated presentation
 * explaining the full pipeline from tokenization to the agentic loop.
 *
 * Built using the Elucim DSL builder API.
 * Run: npx tsx packages/dsl/examples/build-agentic-loop.ts
 */
import { presentation, darkTheme } from '../src/builders';

const t = darkTheme;

const doc = presentation('From Words to Agents', darkTheme, { showNotes: true })

  // ─── Slide 1: Title ─────────────────────────────────────────────────
  .slide('From Words to Agents', s => {
    // Centered big title
    s.at(0);
    s.title('From Words to Agents', { y: 200, fontSize: 36 });
    s.subtitle('How LLMs Think, Speak, and Act', { y: 250, fontSize: 20 });

    // Core equation
    s.wait(5);
    s.latex('P(w_t \\mid w_1, w_2, \\ldots, w_{t-1})', { y: 330, fontSize: 32, color: t.warning });

    // Decorative dots
    s.wait(10);
    const dotColors = t.palette;
    const dotY = 450;
    for (let i = 0; i < 8; i++) {
      s.addAt(40 + i * 3, {
        type: 'circle',
        cx: 250 + i * 55, cy: dotY, r: 6,
        fill: dotColors[i], stroke: 'none',
        fadeIn: 10,
      });
    }

    s.at(75);
    s.text('A visual journey from tokens to autonomous agents', {
      x: s.cx, y: 520, fontSize: 14, color: t.muted,
    });
  }, { notes: 'Title slide -- frame the journey from basic text to intelligent agents.' })

  // ─── Slide 2: Tokenization ──────────────────────────────────────────
  .slide('Tokenization', s => {
    s.title('Step 1: Tokenization');
    s.subtitle('Breaking text into pieces the model can understand');

    // Input sentence
    s.wait(5);
    s.text('"The cat sat on the mat"', {
      x: s.cx, y: 155, fontSize: 18, color: t.warning,
      fontFamily: 'monospace',
    });

    // Arrow down
    s.wait(5);
    s.arrow(s.cx, 170, s.cx, 195, { color: t.muted });

    // Token boxes
    s.wait(3);
    const tokens = s.boxRow(['The', 'cat', 'sat', 'on', 'the', 'mat'], {
      y: 205, boxWidth: 75, boxHeight: 36, gap: 10,
      fontSize: 14, fontFamily: 'monospace',
    });

    // Arrow down to IDs
    s.wait(5);
    s.arrow(s.cx, 250, s.cx, 270, { color: t.muted });

    // Token ID boxes
    s.wait(3);
    const ids = s.boxRow(['464', '3797', '9246', '319', '1820', '2291'], {
      y: 280, boxWidth: 75, boxHeight: 32, gap: 10,
      colors: tokens.map(() => 'rgba(167,139,250,0.15)'),
      strokeColors: tokens.map(() => t.secondary),
      fontSize: 12, fontFamily: 'monospace',
    });

    // Label
    s.wait(5);
    s.text('BPE (Byte Pair Encoding) maps subwords to integer IDs', {
      x: s.cx, y: 355, fontSize: 13, color: t.muted,
    });

    // Key insight
    s.wait(10);
    s.latex('\\text{Vocabulary} \\approx 50{,}000 \\text{ tokens}', {
      y: 410, fontSize: 22, color: t.secondary,
    });

    // Extra detail
    s.wait(5);
    s.text('Common words = 1 token  |  Rare words = multiple tokens', {
      x: s.cx, y: 480, fontSize: 12, color: t.muted,
    });
    s.text('"tokenization" -> ["token", "ization"]  (2 tokens)', {
      x: s.cx, y: 505, fontSize: 12, color: t.subtitle,
      fontFamily: 'monospace',
    });
  }, { notes: 'BPE tokenization: text -> subword tokens -> integer IDs. ~50k vocabulary for GPT models.' })

  // ─── Slide 3: Embeddings ────────────────────────────────────────────
  .slide('Embeddings', s => {
    s.title('Step 2: Token Embeddings');
    s.subtitle('Each token ID becomes a high-dimensional vector');

    // Token ID box
    s.wait(5);
    s.boxRow(['3797'], {
      y: 150, boxWidth: 80, boxHeight: 36,
      colors: ['rgba(167,139,250,0.2)'],
      strokeColors: [t.secondary],
      fontSize: 14, fontFamily: 'monospace',
    });

    // Label
    s.text('"cat"', { x: s.cx, y: 145, fontSize: 12, color: t.muted });

    // Arrow to embedding
    s.wait(3);
    s.arrow(s.cx, 192, s.cx, 218, { color: t.muted });

    // Embedding vector (as matrix)
    s.wait(5);
    s.text('Embedding lookup table', { x: s.cx, y: 215, fontSize: 11, color: t.muted });
    s.wait(2);
    s.matrix([
      ['0.21', '-0.87', '0.53', '0.14', '-0.32', '...', '0.71'],
    ], {
      y: 260, cellSize: 55, fontSize: 13, color: t.primary,
    });

    // Dimension label
    s.wait(5);
    s.latex('\\vec{e} \\in \\mathbb{R}^{d_{\\text{model}}}', {
      y: 330, fontSize: 24, color: t.warning,
    });
    s.text('d_model = 768 (GPT-2) to 12,288 (GPT-4)', {
      x: s.cx, y: 380, fontSize: 12, color: t.muted,
    });

    // Positional encoding
    s.wait(10);
    s.text('+ Positional Encoding', { x: s.cx, y: 425, fontSize: 16, color: t.tertiary });
    s.wait(5);
    s.text('Adds position information so the model knows word order', {
      x: s.cx, y: 450, fontSize: 12, color: t.muted,
    });
    s.latex('\\text{PE}(pos, 2i) = \\sin(pos / 10000^{2i/d})', {
      y: 490, fontSize: 18, color: t.tertiary,
    });
  }, { notes: 'Token IDs -> dense vectors via learned embedding table. Positional encoding added for sequence order.' })

  // ─── Slide 4: Attention Mechanism ───────────────────────────────────
  .slide('Attention', s => {
    s.title('Step 3: Self-Attention');
    s.subtitle('How tokens learn to look at each other');

    // The equation
    s.wait(5);
    s.latex('\\text{Attention}(Q, K, V) = \\text{softmax}\\!\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)\\!V', {
      y: 150, fontSize: 22, color: t.warning,
    });

    // Q, K, V explanation boxes
    s.wait(10);
    const qkv = s.boxRow(['Query (Q)', 'Key (K)', 'Value (V)'], {
      y: 215, boxWidth: 140, boxHeight: 36, gap: 20,
      colors: ['rgba(79,195,247,0.2)', 'rgba(167,139,250,0.2)', 'rgba(244,114,182,0.2)'],
      strokeColors: [t.primary, t.secondary, t.tertiary],
      fontSize: 13,
    });

    // Labels under QKV
    s.wait(3);
    s.text('"What am I', { x: qkv[0].cx, y: 270, fontSize: 10, color: t.primary });
    s.text('looking for?"', { x: qkv[0].cx, y: 282, fontSize: 10, color: t.primary });
    s.text('"What do I', { x: qkv[1].cx, y: 270, fontSize: 10, color: t.secondary });
    s.text('contain?"', { x: qkv[1].cx, y: 282, fontSize: 10, color: t.secondary });
    s.text('"What info', { x: qkv[2].cx, y: 270, fontSize: 10, color: t.tertiary });
    s.text('do I give?"', { x: qkv[2].cx, y: 282, fontSize: 10, color: t.tertiary });

    // Attention matrix visualization
    s.wait(10);
    s.text('Attention Weights (simplified)', { x: s.cx, y: 320, fontSize: 13, color: t.muted });
    s.wait(3);

    // Small heatmap as a matrix
    s.matrix([
      ['0.1', '0.7', '0.1', '0.1'],
      ['0.2', '0.2', '0.4', '0.2'],
      ['0.1', '0.1', '0.1', '0.7'],
      ['0.3', '0.3', '0.2', '0.2'],
    ], {
      y: 370, cellSize: 50, fontSize: 12,
      color: t.text, bracketColor: t.primary,
    });

    // Token labels
    s.wait(5);
    const toks = ['The', 'cat', 'sat', 'on'];
    toks.forEach((tok, i) => {
      s.addAt(s.frame, {
        type: 'text', x: 310 + i * 50, y: 345, content: tok,
        fontSize: 10, fill: t.muted, textAnchor: 'middle',
      });
    });

    s.wait(5);
    s.text('Multi-Head: 8-96 parallel attention patterns', {
      x: s.cx, y: 510, fontSize: 12, color: t.muted,
    });
    s.text('Each head learns different relationships (syntax, semantics, position)', {
      x: s.cx, y: 530, fontSize: 11, color: t.subtitle,
    });
  }, { notes: 'Self-attention: Q*K^T/sqrt(d_k) computes relevance scores, softmax normalizes, multiply by V for weighted output.' })

  // ─── Slide 5: Transformer Block ─────────────────────────────────────
  .slide('Transformer Block', s => {
    s.title('Step 4: The Transformer Block');
    s.subtitle('Attention + Feed-Forward, repeated N times');

    // Vertical block diagram
    s.wait(5);
    const layers = s.boxColumn([
      'Input Embeddings',
      'Multi-Head Attention',
      'Add & Normalize',
      'Feed-Forward Network',
      'Add & Normalize',
      'Output Vectors',
    ], {
      y: 130, boxWidth: 220, boxHeight: 38, gap: 10,
      colors: [
        'rgba(79,195,247,0.15)',
        'rgba(251,191,36,0.15)',
        'rgba(167,139,250,0.15)',
        'rgba(244,114,182,0.15)',
        'rgba(167,139,250,0.15)',
        'rgba(52,211,153,0.15)',
      ],
    });

    // Arrows connecting layers
    s.wait(3);
    s.connectDown(layers, { color: t.muted });

    // Residual connection (skip connection) - dashed arrow on the side
    s.wait(5);
    // Skip from input to Add&Norm
    s.line(layers[0].x - 10, layers[0].cy, layers[0].x - 30, layers[0].cy, { color: t.secondary, dashed: true });
    s.line(layers[0].x - 30, layers[0].cy, layers[0].x - 30, layers[2].cy, { color: t.secondary, dashed: true });
    s.arrow(layers[0].x - 30, layers[2].cy, layers[2].x - 2, layers[2].cy, { color: t.secondary, dashed: true });

    // Skip from attention output to second Add&Norm
    s.line(layers[2].x - 10, layers[2].cy + 5, layers[2].x - 45, layers[2].cy + 5, { color: t.tertiary, dashed: true });
    s.line(layers[2].x - 45, layers[2].cy + 5, layers[2].x - 45, layers[4].cy, { color: t.tertiary, dashed: true });
    s.arrow(layers[2].x - 45, layers[4].cy, layers[4].x - 2, layers[4].cy, { color: t.tertiary, dashed: true });

    // Labels for skip connections
    s.wait(3);
    s.text('Residual', { x: layers[0].x - 55, y: (layers[0].cy + layers[2].cy) / 2, fontSize: 10, color: t.secondary });
    s.text('Residual', { x: layers[2].x - 70, y: (layers[2].cy + layers[4].cy) / 2, fontSize: 10, color: t.tertiary });

    // Right side annotations
    s.wait(5);
    s.text('d_model = 768-12K', {
      x: layers[1].x + layers[1].w + 60, y: layers[1].cy + 4,
      fontSize: 11, color: t.muted,
    });
    s.text('d_ff = 4 * d_model', {
      x: layers[3].x + layers[3].w + 60, y: layers[3].cy + 4,
      fontSize: 11, color: t.muted,
    });

    s.wait(5);
    s.text('This block is repeated N times (N = 12 to 96+ layers)', {
      x: s.cx, y: 560, fontSize: 13, color: t.subtitle,
    });
  }, { notes: 'Transformer block: Multi-Head Attention -> Add&Norm -> FFN -> Add&Norm. Residual connections prevent vanishing gradients. Repeated 12-96 times.' })

  // ─── Slide 6: Stacked Layers ────────────────────────────────────────
  .slide('Deep Representations', s => {
    s.title('Step 5: Stacking Layers');
    s.subtitle('Each layer builds richer understanding');

    // Show N stacked blocks
    s.wait(5);
    const blockLabels = [
      'Layer 1: Surface patterns',
      'Layer 6: Syntax & grammar',
      'Layer 12: Semantics',
      'Layer 24: Reasoning',
      'Layer 48: World knowledge',
      'Layer 96: Complex inference',
    ];
    const blockColors = [
      'rgba(79,195,247,0.2)',
      'rgba(99,102,241,0.2)',
      'rgba(167,139,250,0.2)',
      'rgba(244,114,182,0.2)',
      'rgba(251,191,36,0.2)',
      'rgba(52,211,153,0.2)',
    ];

    const blocks = s.boxColumn(blockLabels, {
      y: 120, boxWidth: 300, boxHeight: 40, gap: 12,
      colors: blockColors, fontSize: 14,
    });

    s.wait(3);
    s.connectDown(blocks, { color: t.muted });

    // Right side: increasing abstraction visualization
    s.wait(10);
    s.text('Increasing abstraction', {
      x: blocks[0].x + blocks[0].w + 90, y: 140,
      fontSize: 12, color: t.muted,
    });
    s.arrow(
      blocks[0].x + blocks[0].w + 90, 155,
      blocks[0].x + blocks[0].w + 90, blocks[5].y + 25,
      { color: t.primary }
    );

    s.wait(5);
    s.latex('\\text{GPT-4:} \\sim 1.8 \\text{ trillion parameters}', {
      y: 490, fontSize: 18, color: t.warning,
    });
    s.text('Each layer has millions of learnable weights', {
      x: s.cx, y: 540, fontSize: 12, color: t.muted,
    });
  }, { notes: 'Stacked transformer layers build increasingly abstract representations. Early layers = syntax, deep layers = reasoning.' })

  // ─── Slide 7: Next Token Prediction ─────────────────────────────────
  .slide('Next Token Prediction', s => {
    s.title('Step 6: Predicting the Next Token');
    s.subtitle('The output is a probability distribution over the entire vocabulary');

    // Input context
    s.wait(5);
    s.boxRow(['The', 'capital', 'of', 'France', 'is'], {
      y: 140, boxWidth: 80, boxHeight: 34, gap: 8,
      fontSize: 13, fontFamily: 'monospace',
    });

    // Arrow down
    s.wait(5);
    s.arrow(s.cx, 180, s.cx, 200, { color: t.muted });
    s.text('Transformer (96 layers)', { x: s.cx, y: 210, fontSize: 11, color: t.muted });
    s.arrow(s.cx, 218, s.cx, 238, { color: t.muted });

    // Bar chart showing probability distribution
    s.wait(5);
    s.barChart([
      { label: 'Paris', value: 92, color: t.success },
      { label: 'Lyon', value: 3, color: t.primary },
      { label: 'the', value: 2, color: t.secondary },
      { label: 'a', value: 1, color: t.tertiary },
      { label: 'Berlin', value: 0.5, color: t.muted },
      { label: '...', value: 1.5, color: t.muted },
    ], {
      x: 150, y: 240, width: 600, height: 200,
      maxValue: 100, valueFormat: 'percent',
      labelFontSize: 12, gap: 0.25,
    });

    // Softmax formula
    s.wait(10);
    s.latex('P(w_i) = \\frac{e^{z_i}}{\\sum_j e^{z_j}} \\quad \\text{(softmax)}', {
      y: 480, fontSize: 20, color: t.warning,
    });

    // Sampling note
    s.wait(5);
    s.text('Temperature controls randomness: T=0 -> greedy, T=1 -> diverse', {
      x: s.cx, y: 540, fontSize: 12, color: t.muted,
    });
  }, { notes: 'Final layer output -> linear projection -> softmax = probability distribution over ~50K tokens. Sampling strategy selects the next token.' })

  // ─── Slide 8: Autoregressive Generation ─────────────────────────────
  .slide('Autoregressive Loop', s => {
    s.title('Step 7: Autoregressive Generation');
    s.subtitle('Generate one token at a time, feeding output back as input');

    // Show the loop visually
    s.wait(5);

    // Step 1: input
    const step1 = s.boxRow(['The', 'cat'], {
      y: 150, boxWidth: 65, boxHeight: 32, gap: 8,
      fontSize: 12, fontFamily: 'monospace',
    });

    s.wait(5);
    s.arrow(s.cx, 188, s.cx, 205, { color: t.muted });
    s.text('predict next', { x: s.cx, y: 215, fontSize: 10, color: t.muted });

    // Step 2: extended
    s.wait(5);
    const step2 = s.boxRow(['The', 'cat', 'sat'], {
      y: 230, boxWidth: 65, boxHeight: 32, gap: 8,
      fontSize: 12, fontFamily: 'monospace',
      colors: ['rgba(79,195,247,0.12)', 'rgba(79,195,247,0.12)', 'rgba(52,211,153,0.2)'],
      strokeColors: [t.boxStroke, t.boxStroke, t.success],
    });

    s.wait(5);
    s.arrow(s.cx, 268, s.cx, 285, { color: t.muted });
    s.text('predict next', { x: s.cx, y: 295, fontSize: 10, color: t.muted });

    // Step 3: more
    s.wait(5);
    const step3 = s.boxRow(['The', 'cat', 'sat', 'on'], {
      y: 310, boxWidth: 65, boxHeight: 32, gap: 8,
      fontSize: 12, fontFamily: 'monospace',
      colors: ['rgba(79,195,247,0.12)', 'rgba(79,195,247,0.12)', 'rgba(79,195,247,0.12)', 'rgba(52,211,153,0.2)'],
      strokeColors: [t.boxStroke, t.boxStroke, t.boxStroke, t.success],
    });

    // Final with stop token
    s.wait(5);
    s.arrow(s.cx, 348, s.cx, 365, { color: t.muted });
    s.text('...until', { x: s.cx, y: 375, fontSize: 10, color: t.muted });

    const step4 = s.boxRow(['The', 'cat', 'sat', 'on', 'the', 'mat', '<EOS>'], {
      y: 390, boxWidth: 60, boxHeight: 32, gap: 6,
      fontSize: 11, fontFamily: 'monospace',
      colors: [
        'rgba(79,195,247,0.12)', 'rgba(79,195,247,0.12)', 'rgba(79,195,247,0.12)',
        'rgba(79,195,247,0.12)', 'rgba(79,195,247,0.12)', 'rgba(79,195,247,0.12)',
        'rgba(248,113,113,0.2)',
      ],
      strokeColors: [t.boxStroke, t.boxStroke, t.boxStroke, t.boxStroke, t.boxStroke, t.boxStroke, t.error],
    });

    s.wait(8);
    s.text('<EOS> = End of Sequence token signals completion', {
      x: s.cx, y: 460, fontSize: 12, color: t.error,
    });

    s.wait(5);
    s.text('The entire context is re-processed each step (KV-cache optimizes this)', {
      x: s.cx, y: 500, fontSize: 12, color: t.muted,
    });

    // Loop arrow on the right side
    s.wait(3);
    s.add({
      type: 'line',
      x1: step1[step1.length - 1].x + step1[step1.length - 1].w + 30,
      y1: step1[0].cy,
      x2: step4[step4.length - 1].x + step4[step4.length - 1].w + 30,
      y2: step4[0].cy,
      stroke: t.warning,
      strokeWidth: 2,
      strokeDasharray: '4 4',
      fadeIn: 15,
    });
    s.text('loop', {
      x: step1[step1.length - 1].x + step1[step1.length - 1].w + 45,
      y: (step1[0].cy + step4[0].cy) / 2 + 4,
      fontSize: 10, color: t.warning,
    });
  }, { notes: 'Autoregressive = generate one token at a time, append to context, repeat. Stops at EOS or max length. KV-cache avoids redundant computation.' })

  // ─── Slide 9: Structured Output / Tool Calls ────────────────────────
  .slide('Structured Output', s => {
    s.title('Step 8: From Text to Structure');
    s.subtitle('LLMs can be trained to emit structured JSON, including tool calls');

    // Show text generation vs structured
    s.wait(5);

    // Left: normal text
    s.text('Normal generation:', {
      x: 225, y: 145, fontSize: 13, color: t.muted,
    });
    s.rect(75, 155, 300, 80, { fill: 'rgba(79,195,247,0.08)', stroke: t.primary, rx: 8 });
    s.text('"The capital of France is Paris,', {
      x: 225, y: 185, fontSize: 12, color: t.text,
      fontFamily: 'monospace', anchor: 'middle',
    });
    s.text('a beautiful city known for..."', {
      x: 225, y: 205, fontSize: 12, color: t.text,
      fontFamily: 'monospace', anchor: 'middle',
    });

    // Right: structured output
    s.wait(5);
    s.text('Tool call generation:', {
      x: 675, y: 145, fontSize: 13, color: t.muted,
    });
    s.rect(525, 155, 300, 125, { fill: 'rgba(251,191,36,0.08)', stroke: t.warning, rx: 8 });
    s.text('{', { x: 555, y: 178, fontSize: 11, color: t.warning, fontFamily: 'monospace', anchor: 'start' });
    s.text('"tool": "search",', { x: 570, y: 195, fontSize: 11, color: t.text, fontFamily: 'monospace', anchor: 'start' });
    s.text('"args": {', { x: 570, y: 212, fontSize: 11, color: t.text, fontFamily: 'monospace', anchor: 'start' });
    s.text('"query": "capital of France"', { x: 585, y: 229, fontSize: 11, color: t.success, fontFamily: 'monospace', anchor: 'start' });
    s.text('}', { x: 570, y: 246, fontSize: 11, color: t.text, fontFamily: 'monospace', anchor: 'start' });
    s.text('}', { x: 555, y: 263, fontSize: 11, color: t.warning, fontFamily: 'monospace', anchor: 'start' });

    // Key insight
    s.wait(10);
    s.text('Same model, same mechanism -- the training data teaches the format', {
      x: s.cx, y: 330, fontSize: 14, color: t.subtitle,
    });

    // How it works
    s.wait(8);
    const steps = s.boxRow(['System prompt', 'Tool schemas', 'User query', 'LLM decides'], {
      y: 370, boxWidth: 130, boxHeight: 36, gap: 15,
      fontSize: 11,
      colors: [
        'rgba(167,139,250,0.15)', 'rgba(251,191,36,0.15)',
        'rgba(79,195,247,0.15)', 'rgba(52,211,153,0.15)',
      ],
      strokeColors: [t.secondary, t.warning, t.primary, t.success],
    });

    s.wait(5);
    s.text('The model sees tool definitions and learns when to call them', {
      x: s.cx, y: 440, fontSize: 12, color: t.muted,
    });

    // Function calling formats
    s.wait(5);
    s.text('Formats: OpenAI function_call | Anthropic tool_use | Open-source ReAct', {
      x: s.cx, y: 480, fontSize: 11, color: t.muted, fontFamily: 'monospace',
    });
  }, { notes: 'LLMs trained with tool schemas learn to output structured JSON tool calls instead of free text. Same autoregressive mechanism.' })

  // ─── Slide 10: The Agentic Loop ─────────────────────────────────────
  .slide('The Agentic Loop', s => {
    s.title('Step 9: The Agentic Loop');
    s.subtitle('Observe -> Reason -> Act -> Observe (repeat)');

    s.wait(5);

    // Central loop diagram using graph
    s.graph([
      { id: 'user', x: 450, y: 140, label: 'User', color: t.primary, radius: 28 },
      { id: 'llm', x: 450, y: 280, label: 'LLM', color: t.warning, radius: 32 },
      { id: 'tool1', x: 250, y: 420, label: 'Search', color: t.success, radius: 24 },
      { id: 'tool2', x: 450, y: 420, label: 'Code', color: t.secondary, radius: 24 },
      { id: 'tool3', x: 650, y: 420, label: 'Files', color: t.tertiary, radius: 24 },
      { id: 'thread', x: 720, y: 280, label: 'Thread', color: t.muted, radius: 26 },
    ], [
      { from: 'user', to: 'llm', directed: true, label: 'query', color: t.primary },
      { from: 'llm', to: 'tool1', directed: true, label: 'call', color: t.warning },
      { from: 'llm', to: 'tool2', directed: true, label: 'call', color: t.warning },
      { from: 'llm', to: 'tool3', directed: true, label: 'call', color: t.warning },
      { from: 'tool1', to: 'thread', directed: true, label: 'result', color: t.success },
      { from: 'tool2', to: 'thread', directed: true, label: 'result', color: t.secondary },
      { from: 'tool3', to: 'thread', directed: true, label: 'result', color: t.tertiary },
      { from: 'thread', to: 'llm', directed: true, label: 'context', color: t.muted },
    ], {
      nodeRadius: 24, edgeWidth: 2, labelColor: '#fff',
    });

    // The loop annotation
    s.wait(15);
    s.text('The thread accumulates context:', {
      x: 180, y: 210, fontSize: 12, color: t.subtitle, anchor: 'start',
    });
    s.text('1. User message', { x: 180, y: 230, fontSize: 11, color: t.primary, anchor: 'start' });
    s.text('2. LLM reasoning + tool call', { x: 180, y: 248, fontSize: 11, color: t.warning, anchor: 'start' });
    s.text('3. Tool result', { x: 180, y: 266, fontSize: 11, color: t.success, anchor: 'start' });
    s.text('4. LLM reasons again...', { x: 180, y: 284, fontSize: 11, color: t.text, anchor: 'start' });
    s.text('5. Until: final answer or', { x: 180, y: 302, fontSize: 11, color: t.error, anchor: 'start' });
    s.text('   max iterations reached', { x: 180, y: 318, fontSize: 11, color: t.error, anchor: 'start' });

    s.wait(5);
    s.text('Each iteration: full transformer forward pass on the growing thread', {
      x: s.cx, y: 530, fontSize: 12, color: t.muted,
    });
  }, { notes: 'The agentic loop: User query -> LLM reasons -> emits tool call -> tool executes -> result appended to thread -> LLM reasons again. Repeats until done.' })

  // ─── Slide 11: Full Picture ─────────────────────────────────────────
  .slide('The Complete Pipeline', s => {
    s.title('Putting It All Together');
    s.subtitle('From keystrokes to autonomous action');

    // Horizontal pipeline
    s.wait(5);
    const pipeline = s.boxRow(
      ['Text', 'Tokens', 'Vectors', 'Attention', 'Layers', 'Softmax', 'Token', 'Tool?'],
      {
        y: 160, boxWidth: 80, boxHeight: 46, gap: 8,
        fontSize: 11,
        colors: [
          'rgba(79,195,247,0.15)', 'rgba(99,102,241,0.15)',
          'rgba(167,139,250,0.15)', 'rgba(251,191,36,0.15)',
          'rgba(244,114,182,0.15)', 'rgba(52,211,153,0.15)',
          'rgba(79,195,247,0.15)', 'rgba(251,191,36,0.15)',
        ],
        strokeColors: [t.primary, '#6366f1', t.secondary, t.warning, t.tertiary, t.success, t.primary, t.warning],
      }
    );

    // Step labels under each box
    s.wait(5);
    const stepLabels = ['Input', 'BPE', 'Embed', 'QKV', 'Nx', 'P(w)', 'Sample', 'Decide'];
    stepLabels.forEach((label, i) => {
      s.addAt(s.frame, {
        type: 'text',
        x: pipeline[i].cx, y: pipeline[i].y + pipeline[i].h + 15,
        content: label, fontSize: 9,
        fill: t.muted, textAnchor: 'middle',
      });
    });

    // The big loop arrow for autoregressive
    s.wait(5);
    s.text('Autoregressive loop', {
      x: s.cx, y: 246, fontSize: 11, color: t.warning,
    });
    // Curved arrow represented as a line below
    s.line(pipeline[6].cx, pipeline[6].y + pipeline[6].h + 25, pipeline[0].cx, pipeline[0].y + pipeline[0].h + 25, {
      color: t.warning, dashed: true, strokeWidth: 2,
    });
    s.arrow(pipeline[0].cx, pipeline[0].y + pipeline[0].h + 25, pipeline[0].cx, pipeline[0].y + pipeline[0].h + 3, {
      color: t.warning, headSize: 6,
    });

    // Agentic extension
    s.wait(10);
    s.text('When the model predicts a tool call token pattern:', {
      x: s.cx, y: 300, fontSize: 13, color: t.subtitle,
    });

    // Agentic flow
    s.wait(5);
    const agentFlow = s.boxRow(
      ['Tool Call JSON', 'Execute Tool', 'Result', 'Back to Thread'],
      {
        y: 330, boxWidth: 140, boxHeight: 38, gap: 12,
        fontSize: 12,
        colors: [
          'rgba(251,191,36,0.15)', 'rgba(52,211,153,0.15)',
          'rgba(167,139,250,0.15)', 'rgba(79,195,247,0.15)',
        ],
        strokeColors: [t.warning, t.success, t.secondary, t.primary],
      }
    );

    // Big loop arrow for agentic
    s.wait(5);
    s.line(agentFlow[3].cx, agentFlow[3].y + agentFlow[3].h + 10, agentFlow[0].cx, agentFlow[0].y + agentFlow[0].h + 10, {
      color: t.error, dashed: true, strokeWidth: 2,
    });
    s.arrow(agentFlow[0].cx, agentFlow[0].y + agentFlow[0].h + 10, agentFlow[0].cx, agentFlow[0].y + agentFlow[0].h + 2, {
      color: t.error, headSize: 6,
    });
    s.text('Agentic loop (until final answer)', {
      x: s.cx, y: agentFlow[0].y + agentFlow[0].h + 25, fontSize: 11, color: t.error,
    });

    s.wait(5);
    s.text('The entire autoregressive pipeline runs inside each agentic iteration', {
      x: s.cx, y: 465, fontSize: 12, color: t.muted,
    });

    // Key numbers
    s.wait(5);
    s.text('GPT-4: ~1.8T params | 128K context | 96 layers | ~50K vocab', {
      x: s.cx, y: 510, fontSize: 11, color: t.subtitle, fontFamily: 'monospace',
    });
  }, { notes: 'Complete pipeline: text -> BPE -> embed -> Nx transformer layers -> softmax -> sample. Tool call patterns trigger the agentic loop. Each iteration = full forward pass.' })

  // ─── Slide 12: Thank You ────────────────────────────────────────────
  .slide('Thank You', s => {
    s.at(0);
    s.title('From Words to Agents', { y: 220, fontSize: 34 });
    s.wait(5);
    s.subtitle('Every intelligent agent action begins with predicting the next token', { y: 265, fontSize: 16 });

    // Key takeaways
    s.wait(10);
    const takeaways = [
      'Tokenization: text -> integer IDs',
      'Embeddings: IDs -> dense vectors',
      'Attention: tokens learn to look at each other',
      'Transformer: attention + FFN, stacked N times',
      'Softmax: probability distribution over vocabulary',
      'Autoregressive: generate one token at a time',
      'Tool calls: structured output from same mechanism',
      'Agentic loop: reason -> act -> observe -> repeat',
    ];

    const colors = t.palette;
    takeaways.forEach((text, i) => {
      s.addAt(s.frame + i * 5, {
        type: 'fadeIn', duration: 12, children: [{
          type: 'text',
          x: s.cx, y: 320 + i * 22,
          content: text,
          fontSize: 12,
          fill: colors[i],
          textAnchor: 'middle',
        }],
      });
    });

    s.at(s.frame + takeaways.length * 5 + 20);
    s.text('Built with Elucim -- animated explanations for the web', {
      x: s.cx, y: 570, fontSize: 13, color: t.muted,
    });
  }, { notes: 'Closing slide -- recap the journey from tokens to agents. Each concept builds on the previous.' })

  .build();

// ─── Output ─────────────────────────────────────────────────────────────────

const json = JSON.stringify(doc, null, 2);

// Write to file
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const outPath = join(dirname(fileURLToPath(import.meta.url)), 'agentic-loop.json');
writeFileSync(outPath, json, 'utf-8');
console.log(`Wrote ${json.length} chars to ${outPath}`);
console.log(`${doc.root.type === 'presentation' ? (doc.root as any).slides.length : 0} slides`);
