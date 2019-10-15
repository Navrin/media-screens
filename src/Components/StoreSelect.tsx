import React, { useState, useCallback } from "react";
import { observer, inject } from "mobx-react";
import { MetaStore } from "../stores/meta";
import styled from "styled-components";

const SelectBox = styled.div`
    display: flex;
    height: 100vh;
    width: 100vw;

    justify-content: center;
    align-items: center;
    background: rgba(66, 66, 66);
    color: white;
    flex-direction: column;
`;

const Button = styled.button`
    margin-top: 15px;
    width: 175px;
    height: 75px;
    padding: 5px;

    font-size: 1.3rem;
    fill: none;
    background: rgba(200, 220, 200);
    color: rgba(50, 50, 50);
`;

const StoreSelect = (props: { metaStore?: MetaStore }) => {
    const [store, setStore] = useState("");
    const handleChange = useCallback(
        (r: React.ChangeEvent<HTMLSelectElement>) => {
            setStore(r.target.value);
        },
        [setStore],
    );

    const handleSubmit = useCallback(() => {
        props.metaStore!.setSelectedStore(store);
    }, [props.metaStore, store]);

    return props.metaStore!.stores ? (
        <SelectBox>
            <h3>Select store.</h3>
            <select value={store} onChange={handleChange}>
                {props.metaStore!.stores.map(s => (
                    <option key={s} value={s}>
                        {s}
                    </option>
                ))}
            </select>
            <Button onClick={handleSubmit}>Confirm choice</Button>
        </SelectBox>
    ) : (
        <div>Loading...</div>
    );
};

export default inject("metaStore")(observer(StoreSelect));
