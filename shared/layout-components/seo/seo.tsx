"use client"
import React, { useEffect } from 'react'

const Seo = ({ title }:any) => {
  useEffect(() => {
    document.title = `VSC CRM - ${title}`
  }, [])
  
  return (
    <>
    </>
  )
}

export default Seo;