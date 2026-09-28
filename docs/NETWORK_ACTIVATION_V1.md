# RCL Network Activation v1

The activation layer is a lightweight guide for signed-in members on `/social`.

It is intentionally based on real product state rather than synthetic progress:

- **Identity**: display name, avatar and bio are present.
- **People**: the member follows at least two people or has at least one accepted connection.
- **Community**: the member belongs to at least one community.
- **Conversation**: the member has published at least one network post.

The guide is dismissible for three days in local storage, automatically disappears after all four actions are complete, and must never block the Social composer or replace the underlying profile, connection, community or posting systems.
