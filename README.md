This is a fork of normalizr that introduces one single feature, the `idAttribute` callback function for schemas is not only called with its corresponding entity, but also the entity's parent.

This means that we can create compound ids of the two which is necessary for the authors array on works.

This feature is also present in normalizr V3 but to avoid possible issues with `assembleEntity` and the general pain of a changed api, this change was deemed safer/easier for now.
