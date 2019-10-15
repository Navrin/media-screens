import React from "react";
import styled from "styled-components";
import { observer, inject } from "mobx-react";
import { MetaStore } from "./stores/meta";
import StoreSelect from "./Components/StoreSelect";
import MediaRenderer from "./Components/MediaRenderer";

const Base = styled.main`
    display: flex;
    justify-content: center;
    flex-direction: column;
`;

const App = (props: { metaStore?: MetaStore }) => {
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
