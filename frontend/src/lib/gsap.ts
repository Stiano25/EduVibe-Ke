import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { MotionPathPlugin } from 'gsap/MotionPathPlugin'

gsap.registerPlugin(useGSAP, MotionPathPlugin)

export { gsap, useGSAP, MotionPathPlugin }
