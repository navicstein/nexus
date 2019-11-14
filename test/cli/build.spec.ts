import { withContext, gitFixture } from '../__helpers'

const ctx = withContext()
  .use(gitFixture)
  .build()

it('can build with minimal server + schema + prisma', async () => {
  ctx.fs.write(
    'package.json',
    `
      {
        "name": "test-app",
        "dependencies": {
          "pumpkins": "${ctx.pathAbsoluteToProject}"
        },
        "license": "MIT"
      }
    `
  )

  ctx.run('yarn')

  // HACK to work around oclif failing on import error
  ctx.run('rm -rf node_modules/pumpkins/src')

  ctx.run('touch dev.db')

  ctx.fs.write(
    'schema.prisma',
    `
      datasource db {
        provider = "sqlite"
        url      = "file:dev.db"
      }

      generator photon {
        provider = "photonjs"
      }

      model User {
        id   Int    @id
        name String
      }
    `
  )

  ctx.fs.write(
    'tsconfig.json',
    `
    {
      "compilerOptions": {
        "target": "es2016",
        "module": "commonjs",
        "strict": true,
        "outDir": "dist",
        "lib": ["esnext"]
      },
    }
  `
  )

  ctx.fs.write(
    'schema.ts',
    `queryType({
        definition(t) {
          t.field('foo', {
            type: 'Foo',
            resolve() {
              return {
                bar: 'qux'
              }
            }
          })
        }
      })

      objectType({
        name: 'Foo',
        definition(t) {
          t.string('bar')
        }
      })
    `
  )

  ctx.fs.write(
    'app.ts',
    `
      import { createApp } from 'pumpkins'
      createApp().startServer()
    `
  )

  expect(ctx.run('yarn -s pumpkins build')).toMatchInlineSnapshot(`
    Object {
      "status": 0,
      "stderr": "",
      "stdout": "🎃  Running Prisma generators ...
    🎃  Generating Nexus artifacts ...
    🎃  Compiling ...
    🎃  Pumpkins server successfully compiled!
    ",
    }
  `)

  expect(ctx.fs.inspectTree('dist')).toMatchInlineSnapshot(`
    Object {
      "children": Array [
        Object {
          "name": "app.js",
          "size": 91,
          "type": "file",
        },
        Object {
          "name": "app__original__.js",
          "size": 155,
          "type": "file",
        },
        Object {
          "name": "schema.js",
          "size": 316,
          "type": "file",
        },
      ],
      "name": "dist",
      "size": 562,
      "type": "dir",
    }
  `)
})