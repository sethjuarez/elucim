---
status: scratchpad
---

# State machine scratchpad

This is a working agreement for how Elucim state machines should behave. It is intentionally independent of the current implementation so we can stop whack-a-mole fixes and check the product against one coherent model.

## Core principle

Entry and Exit are pseudo-nodes. States are animations. Edges are transitions.

- Mental model: a node graph similar to Fusion in DaVinci Resolve, but for Elucim interaction flow rather than compositing.
- **Entry** starts the machine and points to the first animation state.
- **State nodes** describe animation states and only own state details.
- **Transition edges** describe movement between states and own all transition/event details.
- **Exit** is a terminal pseudo-node that stops the machine.

## Node types

### Entry

- Always exists in every machine.
- Is not a state and does not count as a state.
- Has no animation.
- Has exactly one outgoing edge.
- Points to the first real animation state.
- Owns the start/activation event for leaving Entry.
- Cannot be deleted or renamed.
- Can be visually dragged without changing semantics.
- Should not create or require a duplicate "entry animation node".
- Should not cause a target state to display "start target"; the incoming Entry edge already communicates that.

### State

- Represents one animation state.
- Has a stable name/id.
- May reference one timeline.
- May have no timeline, meaning it is a waiting/logical state.
- Can be previewed directly.
- Can be renamed.
- Can be dragged.
- Can be deleted when doing so leaves the machine valid.
- State details should show only:
  - state name
  - timeline/animation selector
  - preview state
- State details should not show:
  - transitions
  - event inputs
  - entry state
  - trigger/schema plumbing
  - "start target" labels

### Exit

- Built-in terminal pseudo-node.
- Is not a state and does not count as a state.
- Has no animation.
- Has no outgoing transitions.
- Cannot be deleted or renamed.
- Appears when a transition targets Exit, or when the UI offers a terminal target affordance.
- Reaching Exit stops the current machine preview/run.
- Exit details should be explanatory only.

## Transition edges

Transitions belong to edges, not nodes.

- Connecting state to state creates a selected transition edge.
- Connecting state to Exit creates a terminal transition edge.
- Selecting an edge opens transition details.
- Edge details should show:
  - transition type
  - source state, read-only
  - target state or Exit
  - delete transition
- State inspectors should not list or edit transitions.
- Edge labels and edge paths should both be selectable.
- Edge selection must be visually obvious.

## Transition types

### Next

Automatic non-event transition.

- Label: `Next`
- Has no event name.
- Runs when the source state's timeline completes.
- If the source state has no timeline, we need one explicit rule:
  - preferred: treat `Next` as immediate and document it.
- Only one `Next` transition should be allowed per source state.
- Can target another state or Exit.
- `Next -> Exit` stops the machine after the source state finishes.

### Event

User/host-triggered transition.

- Label: `Event: <name>`
- Has an event name.
- Waits until that event is fired while the source state is active.
- Can target another state or Exit.
- Event names are scoped by source state.
- Duplicate event names from the same source state should be blocked or uniqued.
- Event inputs should be derived from event transitions, not edited separately in machine details.
- Editor authoring should offer a guided event preset list first, then show only the extra fields needed by that event.

## Supported events

Events should start small for MVP, but the model must stay expandable. The DSL can store event names as normalized strings while the editor presents a guided set first.

### MVP events

- `onStart`
  - Entry edge only.
  - Internal activation event fired automatically when preview/run starts.
  - Default Entry behavior.
- `onClick`
  - Entry edge and normal state transition edges.
  - On Entry: starts the machine when the scene/host is clicked or tapped.
  - On a state transition: fires that transition while its source state is active.
- `onKey`
  - Entry edge and normal state transition edges.
  - Keyboard trigger with key metadata when exact key matching is needed.
  - Editor fields: event preset = `onKey`, key = exact key such as `a`, `Enter`, `Escape`, or `ArrowRight`.
- `reset`
  - Normal state transition event with a common convention: return through Entry.
  - Not a separate machine-level reset state.
  - Usually authored from `any` to `entry`.
  - If Entry uses `onStart`, reset returns to the first state immediately; if Entry is gated, reset waits at Entry for that start event.
  - Editor fields: event preset = `reset`, target = `Entry`.
- Custom event names
  - Normal state transition events.
  - Examples: `approve`, `reject`, `showDetails`, `focusMetric`.
  - Custom names should use stable normalized IDs.
  - Editor fields: event preset = custom, custom event name = normalized ID.

### Not an event: Next

- `Next` is a transition type, not a user event.
- It runs automatically when the source state's animation/timeline completes.
- We should avoid allowing custom event name `next` in the MVP because it conflicts with automatic `Next`.

### Reserved/internal names

These should not be user-authored as normal event names:

- `complete`
  - internal signal when a state timeline finishes.
  - drives automatic `Next`.
- `entry`
  - internal pseudo-node/source concept.
- `exit`
  - terminal target concept.
- `next`
  - reserved to avoid confusion with the `Next` transition type.

### Future expansion

The event model should expand without changing the Entry/State/Edge principles.

Potential future event families:

- Pointer events:
  - `onDoubleClick`
  - `onHover`
  - `onHoverEnd`
  - `onPointerDown`
  - `onPointerUp`
  - `onDragStart`
  - `onDragEnd`
- Rich keyboard events:
  - `onKeyPress`
  - `onArrowNext`
  - `onArrowBack`
  - exact-key metadata such as `{ event: 'onKey', key: 'k' }`
- Playback/control events:
  - `onPlay`
  - `onPause`
  - `onResume`
  - `onSkip`

Scoped or parameterized events should be modeled as event metadata, not by overloading names:

```ts
{
  event: 'onClick',
  target: 'button-1'
}
```

That would mean "while this source state is active, clicking `button-1` fires this transition." The MVP can treat all events as scene/host-level events and add scoped targets later.

Editor event-picker model:

- Preset dropdown:
  - `onClick`
  - `reset`
  - `onKey`
  - custom
- Conditional fields:
  - `onKey` shows `key`.
  - custom shows `event name`.
  - future pointer-scoped events may show `target`.
- Edge labels should summarize the preset and metadata:
  - `onClick`
  - `Key: A`
  - `Custom: approve`

## Preview behavior

- Previewing a state starts that state's timeline at frame 0.
- Previewing a machine starts from Entry, follows the explicit Entry edge, and begins the target state's timeline.
- Preview highlights the active state and the transition edge that most recently fired.
- Event buttons appear only for event transitions whose source is the current preview state, plus global `any` transitions.
- `Next` is automatic only; it is not shown as a trigger button and runs when the active state's timeline completes.
- Event controls should use friendly labels:
  - `onClick` -> `Click`
  - `back` -> `Back`
  - `reset` -> `Reset`
  - `onKey` with `key: "A"` -> `Press A`
  - custom events use the custom event name.
- `onKey` transitions should respond to keyboard input while the preview runner has focus, with a visible simulation button for discoverability and tests.
- Transitions targeting Entry resolve through the Entry edge; this is how reset-like behavior returns to the start.
- Reaching Exit stops playback and shows an exited status.
- Missing events are no-ops.
- Preview must not mutate the authored document; it only changes temporary runner state such as active state, active edge, frame, and last event.
- State-machine preview frame range is the active state's timeline duration, not the scene duration.

## Time and duration ownership

Canvas should not own canonical duration. Canvas is spatial/compositional; timelines and runtime/export policies own time.

### Principle

- A scene/canvas describes the stage:
  - width
  - height
  - background/theme
  - coordinate system
  - child/layer ordering
- A timeline describes time:
  - duration
  - tracks
  - keyframes
  - interpolation
- A state references a timeline, or has no timeline when it is a logical/waiting state.
- A state machine describes control flow:
  - Entry/Exit
  - states
  - transitions
  - events
  - path-dependent runtime behavior
- A preview/export profile describes fixed-frame output policy when fixed length is required.

### Required model change

- `scene.durationInFrames` is not part of v2.
- V1 is legacy compatibility only; use migration helpers when old content needs to enter the v2 model.
- New documents should derive playback duration from the selected timeline, state, machine path, or export policy.
- If a scene has animation, it gets that animation from timelines plus the selected/default state machine, not from a canvas duration.

### Duration by context

| Context | Duration authority |
| --- | --- |
| Canvas layout/design | none; canvas has no time |
| Individual timeline preview | selected timeline duration |
| Individual state preview | referenced state timeline duration, or a logical-state wait/default preview policy |
| Full state-machine preview | active state timeline plus path-dependent transitions/events |
| Automatic `Next` | source state's timeline completion |
| Waiting/event state | indefinite until event, stop, or export policy |
| Exit | terminal; no further duration |
| Fixed export/render | explicit export profile/request |

### Full state-machine preview duration

- A full machine generally has no single total frame count.
- Total runtime depends on the path the machine takes.
- Branching, loops, reset-through-Entry, and event waits make total duration path-dependent or indefinite.
- The preview runner should:
  - start at Entry,
  - play the active state's timeline,
  - fire `Next` when that timeline completes,
  - wait indefinitely for event transitions when no automatic route applies,
  - stop when Exit is reached or the user stops preview.
- The runner's current frame is scoped to the active state's timeline, not the scene.
- Entering a new state resets the active state frame to 0.
- A state with no timeline is a logical/waiting state:
  - if it has a `Next`, `Next` fires immediately,
  - otherwise it waits for an event.

### Export duration

Fixed export is a separate problem from interactive runtime and must be explicit.

Supported export policies should eventually include:

- Export one selected timeline.
- Export one selected state.
- Export a scripted machine path with scheduled events.
- Export a machine until Exit with a required max-frame cap.
- Export the first N frames of an interactive machine simulation.

Rules:

- Export must never silently use canvas duration to truncate an interactive machine.
- Any machine export that can loop or wait must require a max-frame cap.
- If an export policy truncates before Exit, the UI should label that as truncation.
- If a state timeline is longer than a fixed export cap, the UI should warn before export.

### Editor implications

- Canvas settings should show size/layout controls, not "total duration" as a primary canvas property.
- Timeline rows/clips should show their own durations.
- State details should show the referenced timeline duration.
- Machine preview should show:
  - active state,
  - active state frame/duration,
  - last transition/event,
  - running/waiting/exited status.
- Fixed duration controls belong in preview/export settings, not in canvas settings.

### Migration implications

- Existing v1/legacy documents with root `durationInFrames` should migrate safely.
- If a document has timelines, preserve each timeline's own duration.
- If old content relied only on root duration, record that in migration notes or infer an explicit timeline/export setting rather than treating the canvas as timed.
- Validation should reject v2 documents that put `durationInFrames` on `scene`.

## Multiple machines

- Multiple machines are allowed.
- Each machine is an independent interaction controller over the same scene/timelines.
- Only one machine should have authority for a given runtime/editor context.
- The user or host app must explicitly choose which machine has authority.
- Only the authoritative/selected machine is actively previewed at a time in the editor.
- Machines may reuse timelines.
- Machines do not implicitly trigger each other unless we add that feature later.
- Machine details should stay minimal:
  - machine name
  - state count
  - short graph model help
- No entry/reset/input plumbing in machine details.

## Validation rules

- Every machine has at least one state.
- Every machine has Entry semantics.
- Entry has exactly one effective target.
- Entry target must be a real state.
- Exit cannot be a source.
- Transition source must be Entry, `any` if supported, or a real state.
- Transition target must be Entry, a real state, or Exit.
- A state may have at most one automatic Next transition.
- A state may have many Event transitions.
- Same source state cannot have duplicate event names.
- Event transitions require non-empty event names.
- Next transitions must not have event names.
- State timeline references must exist.
- Scene/canvas duration must not be used to validate state-machine preview duration.
- State-machine export policies with indefinite paths must declare a max-frame cap.
- Rename/delete operations must preserve validity.

## UI checklist

- Entry node exists and is draggable.
- Entry node has no details beyond explanation.
- Entry target state has no "start target" badge.
- Exit node appears for terminal transitions.
- State details only show state fields and preview.
- Transition details only show edge fields.
- Machine details are minimal and do not expose schema plumbing.
- Edge labels are clickable.
- State-to-state connect creates a Next edge.
- State-to-Exit connect creates terminal edge.
- Switching an edge from Next to Event exposes event naming.
- Event buttons appear in preview for the active state.
- Next auto-runs after timeline completion.
- Next to Exit stops preview.
- Canvas settings do not present total frame duration as state-machine truth.
- Duration controls are scoped to timelines, states, machine preview status, or export policy.
- Multiple machines remain independent; authority is explicit, never implied.
- Drag positions and viewport persist across tab switches and browser resize.

## Editor-wide design review notes

These came from a dedicated pass using design principles, UX patterns, UX psychology, accessibility, and component-architecture lenses. They are suggestions for reducing expected editor density without removing expert power.

### P0 accessibility and trust

- Add keyboard-operable equivalents for core editor workflows:
  - state-machine graph node/edge selection
  - graph node movement
  - transition creation/deletion
  - canvas resize/rotate handles
  - timeline scrubbing and keyframe movement
  - hierarchy tree traversal
- Make visible focus behavior consistent across buttons, selects, custom controls, canvas regions, graph objects, timeline keyframes, popovers, and panel toggles.
- Context menus should use menu semantics and support Shift+F10 / ContextMenu key invocation.
- Remove, disable, or implement commands whose labels imply behavior that does not happen, especially context-menu Copy/Paste.
- Complete semantic tokens that components already reference, such as warning states, and add themeable selection-handle tokens.
- Treat graph, hierarchy, timeline, and resize handles as first-class keyboard surfaces:
  - graph nodes/edges need focusable selection and a graph outline/table fallback,
  - hierarchy should implement the ARIA tree pattern,
  - timeline scrubber/keyframes should expose slider-like keyboard semantics,
  - split-pane separators need arrow-key resizing and reset.

### P1 density and information architecture

- Treat compactness as a deliberate density mode, not the only mode:
  - `compact` for expert workflows
  - `comfortable` for learning/accessibility
  - possibly `presentation` for demos
- Add semantic density/layout tokens before tuning visuals globally:
  - control heights
  - row heights
  - panel padding
  - timeline track height
  - icon size
  - minimum hit target
- Preserve dense visuals but enlarge hit areas for tiny controls, especially keyframe diamonds, playhead/ruler controls, graph edge labels, expand toggles, and icon buttons.
- Rework dense workspaces around task phases:
  - Design: hierarchy/create, canvas, inspector
  - Animate: timeline, canvas, optional compact inspector
  - State Machine: graph first, details second, preview runner as a collapsible panel
  - Polish: metadata, intent/semantics, suggestions, diagnostics
- State-machine UI should reduce competing affordances:
  - graph canvas is primary
  - selected object details are contextual
  - preview/event runner should be a compact debug console with active machine/state, last event, active transition, running/waiting/exited status, and transition history
  - preview/event runner can collapse when not actively previewing
  - edge-label buttons are primary; transition lists should be fallback/drawer surfaces
- Avoid duplicated panel visibility controls; prefer spatial edge rails for collapsed left/right/bottom panels and keep top chrome for workspace/status.
- Create palette should not expose the entire object model at once; add recent/recommended/search/category layers and keep icon-only grids for compact/expert density.

### P1 component architecture

- Introduce internal editor primitives before more visual tuning:
  - `EditorButton` / `IconButton`
  - `Field`, `NumberField`, `SelectField`, `ColorField`, `TextareaField`
  - `DisclosureSection`
  - `Popover` / `Menu`
  - `TreeView`
  - `SplitPane` / `ResizeHandle`
  - `CanvasHudPanel`
  - shared motion/state-machine inspector panels
- Split `Timeline.tsx` over time into purpose-named components:
  - `MotionPanel`
  - `AnimationTimelinePanel`
  - `StateMachinePanel`
  - `StateMachineGraph`
  - `StateMachinePreviewRunner`
  - `StateMachineDetails`
- Use those primitives to centralize focus rings, disabled states, hover/active states, spacing, density, ARIA behavior, Escape handling, and focus return.

### P2 progressive disclosure and wayfinding

- Inspector sections should not all default open forever; use smart defaults by selected element type and remember user expansion choices.
- Inspector collapsed sections should show summaries, e.g. `Position · x 120, y 80`.
- Timeline details should appear on selection rather than forcing every track/keyframe action to be visible at all times.
- Graph destructive controls should say exactly what they affect, e.g. `Delete selected state`, and layout controls should be grouped as `Layout: Horizontal | Vertical`.
- Workspace tabs should either implement the full ARIA tab pattern or become segmented buttons with `aria-pressed`.
- Panel resize handles should be focusable separators with orientation, min/max/current values, and arrow-key resizing.
- Canvas minimap/zoom HUD controls should be semantic controls or have equivalent keyboard routes.
- Scope editor keyboard shortcuts to the active editor root/focus manager rather than the global window where possible.
