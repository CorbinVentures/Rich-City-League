# RCL Basketball Motion Engine v1

## Purpose
The Lab renderer is a playback surface. Basketball motion is authored, solved, validated, and baked before runtime. Do not use generic crouch/idle clips as basketball motion and do not pose the athlete with ad-hoc React Euler offsets.

## Rig contract
Canonical chains:
- root -> pelvis
- pelvis -> spine_01 -> spine_02 -> spine_03 -> neck/head
- clavicle_l -> upperarm_l -> lowerarm_l -> hand_l -> fingers
- clavicle_r -> upperarm_r -> lowerarm_r -> hand_r -> fingers
- thigh_l -> calf_l -> foot_l
- thigh_r -> calf_r -> foot_r

For every joint preserve the target athlete's bind/rest transform. Anatomical intent must be converted into the target bone basis before local quaternions are written.

## Stationary dribble solve
The first validated action is stationary alternating pound dribble.

### Task-space constraints
- Both feet are planted for the entire cycle.
- Pelvis stays above a minimum loaded-stance height; no kneeling.
- Knees remain flexed in their preferred bend plane.
- Torso has a modest forward athletic lean; head remains up.
- Active hand follows the ball during control/push and reacquisition.
- Elbow pole/hint prevents arm inversion.
- Off hand remains in a protective basketball-ready envelope.
- Ball and hand share explicit contact/release/reacquisition events.

### Contact state machine
CONTROL -> PUSH -> RELEASE -> FLIGHT -> FLOOR_CONTACT -> REBOUND -> REACQUIRE -> CONTROL

IK/contact weights blend smoothly at state boundaries. The ball is not a sinusoidal visual effect.

## Solver order
1. Evaluate base/calibration pose.
2. Lock left/right foot world targets.
3. Solve pelvis and legs with preferred knee bend.
4. Solve spine/chest/head targets.
5. Solve active shoulder/elbow/wrist/hand to ball target using two-bone IK plus elbow hint.
6. Solve off arm.
7. Apply finger contact shaping where practical.
8. Convert solved world transforms back to local transforms.
9. Enforce quaternion normalization and sign continuity.
10. Bake all channels and ball motion to one timeline.

## Validation gate
A candidate animation MUST fail if any of these occur:
- T-pose excursion.
- Knee approaches/touches the floor.
- Foot slides outside tolerance while planted.
- Knee or elbow bends through an invalid plane.
- Hand-ball separation exceeds contact tolerance during CONTROL/PUSH.
- Ball penetrates floor or body.
- Quaternion sign discontinuity or non-unit quaternion.
- First/last frame fails loop closure.
- Different camera views do not show the same mixer/time.

## Runtime rule
Three.js loads and plays the approved baked GLB with AnimationMixer. Runtime IK is reserved for small contact/environment corrections, not for inventing the basketball action.

## Engineering references
- Khronos glTF/Vulkan procedural animation guidance: procedural IK should layer over a plausible base pose, with planted-foot weights and pelvis correction.
- Epic IK Retargeter Speed Planting: use contact/speed information, IK goals, preferred angles, limits and stiffness to stop foot sliding.
- Three.js AnimationMixer: use clips/actions for synchronized baked animation playback.

## Release gate
No Lab motion PR is merged on CI alone. It requires:
1. structural validation,
2. automated motion validation,
3. deployment,
4. device visual review from front, 3/4, side and back.
