import React from "react";
import ReactDOM from "react-dom/client";
import Backoffice from "./Backoffice";
import CloudAuth from "../CloudAuth";
import "../index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode><CloudAuth><Backoffice /></CloudAuth></React.StrictMode>,
);
