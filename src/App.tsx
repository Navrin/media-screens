import React, { useRef, useEffect, useState } from "react";
import styled from "styled-components";
import { observer, inject } from "mobx-react";
import { MetaStore } from "./stores/meta";
import StoreSelect from "./Components/StoreSelect";
import MediaRenderer from "./Components/MediaRenderer";
import { isWithinInterval, parse } from "date-fns";
import * as df from "date-fns";
// const { app } = require("@electron/remote/main");

const OPENING_HOURS = "8:00 am";
const CLOSING_HOURS = "10:00 pm";
const createHourChecker = (s: string) => (d: Date) => parse(s, "hh:mm aa", d);
const openingHours = createHourChecker(OPENING_HOURS);
const closingHours = createHourChecker(CLOSING_HOURS);

function useInterval(callback: () => void, delay: number) {
    const savedCallback = useRef<() => void>();

    // Remember the latest callback.
    useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);

    // Set up the interval.
    useEffect(() => {
        function tick() {
            savedCallback.current!();
        }
        if (delay !== null) {
            let id = setInterval(tick, delay);
            return () => clearInterval(id);
        }
    }, [delay]);
}

const Base = styled.main`
    display: flex;
    justify-content: center;
    flex-direction: column;
`;

const TempHold = styled.main`
    display: flex;
    justify-content: center;
    flex-direction: column;
    width: 100vw;
    height: 100vh;
    background: rgb(0, 0, 0);
`;

const App = (props: { metaStore?: MetaStore }) => {
    const [outsideHours, setOutsideHours] = useState(false);
    if (localStorage.getItem("lastRestart") == null) {
        localStorage.setItem("lastRestart", new Date().toISOString());
    }

    useInterval(() => {
        // const lastRestart = new Date(
        //     localStorage.getItem("lastRestart") || new Date(),
        // );

        const now = new Date();

        // if (df.isAfter(now, df.addDays(lastRestart, 1))) {
        //     console.log("Restarting app due to lack of restarts...");

        //     localStorage.setItem(
        //         "lastRestart",
        //         df.setHours(new Date(), 5).toISOString(),
        //     );
        //     setTimeout(() => {
        //         app.relaunch();
        //         app.exit();
        //     }, 5000);
        // }

        const opening = openingHours(now);
        const closing = closingHours(now);

        const isWithinHours = isWithinInterval(now, {
            start: opening,
            end: closing,
        });

        setOutsideHours(!isWithinHours);
    }, 10000);

    if (outsideHours) {
        return <TempHold />;
    }

    return (
        <Base>
            {props.metaStore!.selectedStore == null ? (
                <StoreSelect />
            ) : (
                <MediaRenderer />
            )}
        </Base>
    );
};

export default inject("metaStore")(observer(App));
