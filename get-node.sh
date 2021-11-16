curl -L https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION-linux-x64.tar.gz | tar xz -C /usr/local --strip-components=1 && \
unlink /usr/local/CHANGELOG.md && unlink /usr/local/LICENSE && unlink /usr/local/README.md && \
# https://github.com/npm/npm/issues/4531
npm config set unsafe-perm true

sh