# Lab Animation Pipeline — verified direction

## Decision
Stop authoring basketball motion in the browser. The current renderer is a playback layer only.

## Why
- The Universal Base Character is explicitly a humanoid rig intended for retargeting and is compatible with the Universal Animation Library.
- glTF skeletal animation is defined as animation channels targeting the actual joint hierarchy's TRS properties.
- The current Lab experiments construct guessed local-space rotations at runtime. Screenshots show those tracks do not produce basketball motion reliably.

## Production pipeline
1. Author or retarget the basketball movement in a DCC/retargeting tool against the Quaternius humanoid rig.
2. Bake the full action to the skeleton at a fixed frame rate.
3. Export a self-contained GLB animation clip using the exact skeleton naming/hierarchy used by the athlete.
4. Validate the clip offline: joint targets exist, duration/frame rate are expected, and the action contains full-body channels.
5. Load the exported clip in Three.js and play it with AnimationMixer. No per-frame bone posing.
6. Drive the basketball from authored contact events/hand attachment rather than an independent sinusoidal bounce.
7. Keep one athlete/mixer/timeline and switch cameras only.

## Acceptance gate for Stationary Handle
Do not merge a basketball animation until preview/device review confirms:
- arms leave bind/T-pose and stay in a basketball-ready envelope;
- hips and knees visibly load while feet remain planted;
- torso has a controlled forward athletic lean;
- left/right dribbles visibly originate from the corresponding hand;
- ball reaches the hand at contact and the floor at bounce;
- no floating feet, crossed feet, hyperextended joints, or ball/body intersection;
- front, 3/4, side and back are the same uninterrupted animation timeline.

## Asset policy
Keep Quaternius attribution/license documentation with the existing self-hosted assets. Do not call hand-authored motion mocap or biomechanically validated unless the source supports that claim.

## Next implementation
The next code change should replace the runtime-generated RCL_Stationary_Handle_RigAudit_v2 tracks with a baked basketball-specific GLB clip. Until that asset exists and passes the acceptance gate, do not create another procedural animation iteration.
