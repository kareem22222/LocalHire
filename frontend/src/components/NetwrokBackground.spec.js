import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let rafCallback
let renderMock
let disposeMock
let createdNodes = []

global.requestAnimationFrame = vi.fn((cb) => {
  rafCallback = cb
  return 1
})

global.cancelAnimationFrame = vi.fn()

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn(() => ({
    matches: false,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })),
})


vi.mock('three', () => {

  class Vector3 {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x
    this.y = y
    this.z = z
  }

  set(x, y, z) {
    this.x = x
    this.y = y
    this.z = z
    return this
  }

  add(v) {
    this.x += v.x
    this.y += v.y
    this.z += v.z
    return this
  }

    distanceTo(v) {
      return Math.sqrt(
        (this.x - v.x) ** 2 +
        (this.y - v.y) ** 2 +
        (this.z - v.z) ** 2
      )
    }
  }


  class Scene {

    constructor() {
      this.children = []
    }

    add(obj) {
      this.children.push(obj)
    }

    clear() {
      this.children = []
    }
  }


  class Color {
    constructor(value) {
      this.value = value
    }
  }


  class PerspectiveCamera {

    constructor() {

      this.position = new Vector3()

      this.aspect = 1
    }

    lookAt = vi.fn()

    updateProjectionMatrix = vi.fn()
  }


  class WebGLRenderer {

    constructor() {
      this.render = renderMock
      this.dispose = disposeMock
    }

    setSize = vi.fn()

    setPixelRatio = vi.fn()
  }


  class SphereGeometry {

    dispose = disposeMock
  }


  class BufferGeometry {

    constructor() {

      this.attributes = {
        position:{
          array:new Float32Array(1000),
          needsUpdate:false
        }
      }
    }


    setAttribute(name,value){
      this.attributes[name]=value
    }


    setDrawRange = vi.fn()

    dispose = disposeMock
  }


 class BufferAttribute {

  constructor(array, itemSize){
    this.array = array
    this.itemSize = itemSize
    this.needsUpdate = false
  }
}


  class Material {

    constructor(options){

      this.opacity = options.opacity

      this.dispose = disposeMock
    }
  }


  class Mesh {

    constructor(_,material){

      this.material=material

      this.position=new Vector3(
        0,
        0,
        0
      )

      this.scale={
        setScalar:vi.fn()
      }


      this.userData={
        velocity:new Vector3(
          0.01,
          0.01,
          0.01
        ),

        baseScale:1
      }


      createdNodes.push(this)
    }
  }


  class LineSegments {

    constructor(geometry){

      this.geometry=geometry
    }
  }


  return {

    Scene,
    Color,
    PerspectiveCamera,
    WebGLRenderer,
    SphereGeometry,
    BufferGeometry,
    BufferAttribute,
    MeshBasicMaterial:Material,
    LineBasicMaterial:Material,
    Mesh,
    LineSegments,
    Vector3

  }

})



describe(
  'NetworkBackground branch coverage',
  ()=>{

    let wrapper


    beforeEach(()=>{

      vi.resetModules()

      createdNodes=[]

      renderMock=vi.fn()

      disposeMock=vi.fn()

      rafCallback=null

      requestAnimationFrame.mockClear()

      window.innerWidth=1400
      window.innerHeight=900

      Math.random=vi.fn(()=>0.5)

    })


    afterEach(()=>{

  wrapper?.unmount()

  vi.clearAllMocks()

})



    async function load(){

      const {default:Component}=await import(
        './NetworkBackground.vue'
      )

      wrapper=mount(Component)

      await wrapper.vm.$nextTick()

      return wrapper
    }



    it(
      'creates scene with nodes and edges',
      async()=>{

        await load()

        expect(createdNodes.length)
          .toBe(60)

      })



    it(
      'executes animation movement and rendering',
      async()=>{

        await load()


        createdNodes[0].position.x=7
        createdNodes[0].position.y=5
        createdNodes[0].position.z=3


        window.dispatchEvent(
          new MouseEvent(
            'mousemove',
            {
              clientX:0,
              clientY:0
            }
          )
        )


        rafCallback()


        expect(renderMock)
          .toHaveBeenCalled()


      })



    it(
      'triggers mouse repulsion logic',
      async()=>{

        await load()


        createdNodes[0].position.x=0.1
        createdNodes[0].position.y=0.1


        rafCallback()


        expect(
          createdNodes[0]
            .scale
            .setScalar
        )
        .toHaveBeenCalled()

      })



    it(
      'handles resize and switches mobile mode',
      async()=>{

        await load()


        window.innerWidth=800

        window.dispatchEvent(
          new Event('resize')
        )


        await wrapper.vm.$nextTick()


        expect(
          wrapper.find('canvas').exists()
        )
        .toBe(false)


      })



   it(
  'supports reduced motion mode',
  async()=>{


    window.matchMedia = vi.fn(() => ({
      matches: true,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))


    await load()


    expect(
      requestAnimationFrame
    )
    .not
    .toHaveBeenCalled()


})



    it(
      'cleans resources on disable',
      async()=>{

        await load()


        window.innerWidth=800

        window.dispatchEvent(
          new Event('resize')
        )


        await wrapper.vm.$nextTick()


        expect(
          disposeMock
        )
        .toHaveBeenCalled()


      })



    it(
      'cleans everything on unmount',
      async()=>{

        await load()


        wrapper.unmount()


        expect(
          cancelAnimationFrame
        )
        .toHaveBeenCalled()


      })


  })