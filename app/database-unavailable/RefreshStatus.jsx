"use client";
import {useState} from "react";
import {RefreshCw} from "lucide-react";

export default function RefreshStatus(){
 const [refreshing,setRefreshing]=useState(false);
 async function refresh(){
  if(refreshing)return;
  setRefreshing(true);
  try{await fetch("/api/service-status?refresh="+Date.now(),{cache:"no-store"});}catch{}
  await new Promise(resolve=>setTimeout(resolve,650));
  window.location.reload();
 }
 return <button type="button" onClick={refresh} disabled={refreshing} aria-live="polite" className="dbUnavailableSecondary">
  <RefreshCw size={14} className={refreshing?"dbStatusSpin":""}/>
  {refreshing?"Checking status…":"Refresh status"}
 </button>;
}