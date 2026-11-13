"use client";
import {RefreshCw} from "lucide-react";
export default function RefreshStatus(){return <button onClick={()=>window.location.reload()} className="dbUnavailableSecondary"><RefreshCw size={14}/> Refresh status</button>;}
