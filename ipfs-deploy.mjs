/* eslint-disable import/no-extraneous-dependencies */
import 'dotenv/config';
import Listr from 'listr';
import { create, globSource } from 'ipfs-http-client';

const pinToLocal = async (cwd = './build', pattern = '**/*', ctx = {}) => {
  const localClient = create();

  let buildCid = '';

  // eslint-disable-next-line no-restricted-syntax
  for await (const file of localClient.addAll(globSource(cwd, pattern), {
    wrapWithDirectory: true,
  })) {
    if (file.path === '') {
      buildCid = file.cid;
    }
  }

  ctx.localCid = buildCid;

  return buildCid;
};

const pinToInfura = async (cwd = './build', pattern = '**/*', ctx = {}) => {
  const projectId = process.env.INFURA_IPFS_PROJECT_ID;
  const projectSecret = process.env.INFURA_IPFS_PROJECT_SECRET;

  const authorization = `Basic ${Buffer.from(
    `${projectId}:${projectSecret}`,
  ).toString('base64')}`;

  let buildCid = '';

  const infuraClient = create({
    host: 'ipfs.infura.io',
    port: 5001,
    protocol: 'https',
    headers: {
      authorization,
    },
  });

  for await (const file of infuraClient.addAll(globSource(cwd, pattern), {
    wrapWithDirectory: true,
  })) {
    if (file.path === '') {
      buildCid = file.cid;
    }
  }

  ctx.infuraCid = buildCid;

  return buildCid;
};

const pinToPinata = async (cid) => {
  const localClient = create();
  const id = await localClient.id();

  const auth = `Bearer ${process.env.PINATA_SECRET_ACCESS_TOKEN}`;

  var config = {
    method: 'POST',
    headers: {
      Authorization: auth,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      hashToPin: `${cid}`,
      pinaOptions: {
        hostNodes: id.addresses.map((address) => address.toString()),
      },
      pinataMetadata: {
        name: 'Pinnacle Bakery Website',
      },
    }),
  };

  return fetch('https://api.pinata.cloud/pinning/pinByHash', config).then(
    (res) => res.json(),
  );
};

const publishName = async (cidPath) => {
  const localClient = create();

  return localClient.name.publish(cidPath, {
    key: 'pinnacle-bakery',
  });
};

const tasks = new Listr([
  {
    title: 'Pinning files to Local IPFS',
    task: (ctx, task) => pinToLocal('./build', '**/*', ctx, task),
  },
  {
    title: 'Pinning files to Infura',
    task: (ctx, task) => pinToInfura('./build', '**/*', ctx, task),
  },
  {
    title: 'Pinning files to Pinata',
    task: (ctx) => pinToPinata(ctx.localCid),
  },
  {
    title: 'Publish new IPNS cid for pinnacle-bakery',
    task: async (ctx) => {
      if (
        ctx.localCid &&
        ctx.infuraCid &&
        `${ctx.localCid}` === `${ctx.infuraCid}`
      ) {
        const { name, value } = await publishName(`/ipfs/${ctx.localCid}`);
        ctx.ipnsName = name;
        ctx.ipnsValue = value;
      } else {
        Promise.reject(
          new Error(
            `Files between local and remote are inconsistent (${ctx.localCid}, ${ctx.infuraCid})`,
          ),
        );
      }
    },
  },
]);

console.log('Deploying the latest build to IPFS');
tasks
  .run()
  .then((ctx) => {
    console.log(
      `${ctx.ipnsName} successfully published with value ${ctx.ipnsValue}`,
    );
  })
  .catch((err) => {
    console.error(err);
  });
