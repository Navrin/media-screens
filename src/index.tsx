import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import App from "./App";
import * as serviceWorker from "./serviceWorker";
import { MetaStore } from "./stores/meta";
import { Provider as StoreProvider } from "mobx-react";

const stores = {
    metaStore: new MetaStore(),
};

ReactDOM.render(
    <StoreProvider {...stores}>
        <App />
    </StoreProvider>,
    document.getElementById("root"),
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.register();

if ((module as any).hot) {
    (module as any).hot.accept("./App", () => {
        const NextApp = require("./App").default;
        ReactDOM.render(NextApp, document.getElementById("root"));
    });
}
