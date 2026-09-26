# RCL Lab — Basketball Motion Math Reference v1

## Coordinate convention
Right-handed world: +Y up, +Z player-forward, +X player-left. All task-space constraints are normalized by measured athlete dimensions; no animation bone is authored by guessed local Euler axes.

## Stationary alternating pound dribble — biomechanical contract
The first production primitive is a stationary alternating pound dribble.

### Base / COM
Let pelvis center be P and floor plane y=0 after rig normalization. Let leg length L_leg = mean(thigh+calf).
- stance width W is solved from the athlete's measured bind stance and pelvis height, not a fixed meter value.
- pelvis is lowered while both feet remain planted.
- knee flexion must remain athletic and non-kneeling; production gate uses an allowed interval rather than a single canonical angle.
- projected COM proxy (pelvis initially; later segment-mass COM) must remain inside the support polygon formed by both feet with a safety margin.
- knees use forward pole targets and must not collapse medially across the ipsilateral hip→foot plane.
- feet are hard contacts during the stationary primitive: ||F_t-F_0|| <= 0.025 m.

### Hand reachable set
For shoulder S and arm lengths l1,l2, a hand target H is feasible only when
|l1-l2|+eps <= ||H-S|| <= l1+l2-eps.
The basketball ready-pocket region is an athlete-scaled convex box/ellipsoid around the loaded pelvis. H is selected from the INTERSECTION of that pocket and the arm reachable shell. If empty, authoring fails. Targets are never clamped after the fact.

### Arm chain
Two-bone IK solves shoulder→elbow→wrist. Elbow bend is selected by a pole vector oriented down/forward/outward. Shoulder/elbow freedom is allowed while the wrist/hand endpoint is stabilized; this models motor redundancy instead of forcing identical proximal joint angles.

### Dribble phases
CONTROL -> PUSH -> RELEASE -> FLOOR_CONTACT -> REBOUND -> REACQUIRE.
Hand-ball contact is a constraint during CONTROL/PUSH and reacquisition. During free flight:
p_b(t)=p_0+v_0 t + 0.5 g t^2, g=(0,-9.81,0).
Floor contact solves the ball center at y=r_ball and reverses vertical velocity with restitution e:
v_y^+ = -e v_y^-.
Horizontal velocity is damped, not zeroed. Reacquisition blends the hand IK target to the predicted ball intercept, not to a sinusoidal bounce.

### Coordination
Dribbling is endpoint-controlled: wrist peak/bounce location and ball trajectory are primary task variables. Shoulder and elbow are allowed coordinated variability while preserving the endpoint. Wrist/finger/elbow motion should remain phase-coherent rather than independently oscillating.

## Mathematical solve

### Support polygon / balance
With left/right foot contact polygons C_L,C_R, support polygon S=conv(C_L union C_R). A static frame is rejected when projected COM c_xz is outside eroded polygon S⊖m. Initial implementation may use pelvis projection as a documented COM proxy; production analytics should use segment-mass weighted COM:
COM = sum_i(m_i c_i)/sum_i m_i.

### Two-bone IK
d=H-S; D=clamp(||d||, |l1-l2|+eps, l1+l2-eps); u=d/D.
Given normalized bend-plane vector n from the pole target, b=normalize(n × u).
a=(l1^2-l2^2+D^2)/(2D)
h=sqrt(max(l1^2-a^2,0))
E=S+a u+h b.
Desired bone directions are E-S and H-E.

### Bind-aware bone orientation
For bind-world primary direction a0 and desired direction a1:
q_swing = quatFromTo(a0,a1).
Twist is solved separately from a calibrated secondary bind axis and pole-plane normal.
q_world_target=q_twist q_swing q_world_bind.
For actual hierarchy parent p:
q_local_target = inverse(q_world_target[p]) q_world_target[child].
Parent target rotations are propagated recursively from pelvis through spine/clavicle/limb chains.

### Quaternion continuity
Normalize every key q_k. If dot(q_{k-1},q_k)<0, q_k=-q_k. Interpolation uses SLERP; translation uses cubic Hermite or monotone cubic interpolation where endpoint velocities are specified.

### Reconstruction gate
After local rotations are generated, reconstruct the COMPLETE world skeleton from target local TRS. Gates are measured from reconstructed joints, never from requested IK targets:
- end-effector error
- foot slide
- knee direction/clearance
- pelvis/COM envelope
- elbow flexion and shoulder abduction
- hand-ball distance during contact
- ball-floor penetration/contact
- quaternion norm/sign continuity
- loop position/rotation error
- mesh/limb self-intersection proxy where available.

## Research-grounded design implications
1. Skilled stationary dribbling shows more consistent bounce placement and longer/more consistent hand-ball contact; therefore contact duration and bounce-point variance are explicit quality metrics.
2. Expert dribbling shows coordinated/in-phase elbow, wrist and finger behavior; the solver must phase-lock distal chain motion instead of animating joints independently.
3. Shoulder/elbow variability can stabilize wrist peak height; therefore endpoint constraints outrank arbitrary fixed shoulder/elbow angles.
4. Basketball change-of-direction performance depends strongly on acceleration/deceleration and force orientation; future crossover/first-step primitives must model COM shift, braking impulse and re-acceleration rather than merely rotating feet.
5. Preparatory knee flexion-extension changes rapid sidestep initiation; future reactive footwork needs a loading/unloading phase, not a static crouch followed by translation.
6. Injury literature supports rejecting dynamic valgus-like knee collapse and poorly controlled early-flexion cutting/landing poses; these are safety/quality constraints, not claims of injury prediction.

## Production rule
Three.js is playback only. Task-space solve -> hierarchy-aware local rotations -> full skeleton reconstruction -> numerical QA -> visual QA -> baked GLB -> AnimationMixer.
