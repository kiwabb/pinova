const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8')
}

function filesUnder(relativePath, extensions) {
  const directory = path.join(root, relativePath)
  const result = []
  const visit = (current) => {
    fs.readdirSync(current, { withFileTypes: true }).forEach((entry) => {
      const fullPath = path.join(current, entry.name)
      if (entry.isDirectory()) visit(fullPath)
      else if (extensions.some((extension) => entry.name.endsWith(extension))) result.push(fullPath)
    })
  }
  visit(directory)
  return result
}

function actionsFromCalls(source, functionName) {
  const actions = new Set()
  const expression = new RegExp(`${functionName}(?:<[^;]*?>)?\\(\\s*['\"]([A-Za-z0-9_]+)['\"]`, 'g')
  for (const match of source.matchAll(expression)) actions.add(match[1])
  return actions
}

function handledActions(relativePath) {
  return new Set([...read(relativePath).matchAll(/event\.action === ['"]([A-Za-z0-9_]+)['"]/g)].map((match) => match[1]))
}

test('小程序调用的用户云函数 action 全部存在服务端处理分支', () => {
  const source = filesUnder('miniprogram', ['.ts']).map((file) => fs.readFileSync(file, 'utf8')).join('\n')
  const clientActions = actionsFromCalls(source, 'callUserService')
  for (const match of read('miniprogram/pages/records/index.ts').matchAll(/action:\s*['"]([A-Za-z0-9_]+)['"]/g)) clientActions.add(match[1])
  const serverActions = handledActions('cloudfunctions/userService/index.js')
  assert.deepEqual([...clientActions].filter((action) => !serverActions.has(action)), [])
})

test('管理后台调用的 action 全部存在服务端处理分支', () => {
  const source = filesUnder('admin/src', ['.ts', '.vue']).map((file) => fs.readFileSync(file, 'utf8')).join('\n')
  const clientActions = actionsFromCalls(source, 'callAdmin')
  const serverActions = handledActions('cloudfunctions/adminService/index.js')
  assert.deepEqual([...clientActions].filter((action) => !serverActions.has(action)), [])
})

test('线上业务工程不包含无鉴权 quickstart 示例云函数', () => {
  assert.equal(fs.existsSync(path.join(root, 'cloudfunctions/quickstartFunctions')), false)
  assert.doesNotMatch(read('uploadCloudFunction.sh'), /quickstartFunctions/)
})

test('管理后台使用 CloudBase Web 身份并在服务端校验管理员文档', () => {
  const source = read('cloudfunctions/adminService/index.js')
  assert.match(source, /getCloudbaseContext\(\)/)
  assert.match(source, /TCB_UUID/)
  assert.match(source, /adminsRef\.doc\(uid\)/)
})
