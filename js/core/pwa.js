"use strict";
if("serviceWorker" in navigator&&location.protocol.startsWith("http")){addEventListener("load",()=>navigator.serviceWorker.register("service-worker.js").catch(()=>{}));}
