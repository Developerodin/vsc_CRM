"use client"
import "./globals.scss";
import { Provider } from "react-redux";
import store from "@/shared/redux/store";
import PrelineScript from "./PrelineScript";
import {   useState } from "react";
import { Initialload, BranchProvider } from "@/shared/contextapi";


const RootLayout = ({children}:any) =>{
  const [pageloading , setpageloading] = useState(false)
    return(
      <>
      <Provider store={store}>
        <BranchProvider>
          <Initialload.Provider value={{ pageloading , setpageloading }}>
            {children}
          </Initialload.Provider>
        </BranchProvider>
      </Provider>
      <PrelineScript/>
      </>
    )
  }
  export default RootLayout
