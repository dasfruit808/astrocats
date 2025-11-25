(function initMetaplexStub(global) {
  if (global.Metaplex) return;

  const logPrefix = '[Metaplex Stub]';
  console.warn(`${logPrefix} Using lightweight stub; on-chain NFT lookups will be skipped.`);

  function createStub(connection) {
    return {
      connection,
      __isStub: true,
      nfts() {
        return {
          findAllByOwner({ owner }) {
            console.warn(`${logPrefix} findAllByOwner called for ${owner}; returning empty list.`);
            return {
              async run() {
                return [];
              }
            };
          }
        };
      }
    };
  }

  global.Metaplex = {
    make: createStub,
    __isStub: true
  };
})(typeof window !== 'undefined' ? window : globalThis);
