import { observer } from "mobx-react";
import React from "react";
import styled from "styled-components";
import { MetaStore } from "../stores/meta";

const BaseStatusIndicator = styled.div`
    position: fixed;
    bottom: 0;
    right: 0;
    z-index: 100;
    transform: translateZ(10px);
`;

const StatusIndicatorBase = styled.span`
    opacity: 0.5;
    text-shadow: 1px 1px black;
`;
const StatusIndicatorDown = styled(StatusIndicatorBase)`
    color: rgb(255, 59, 59);
`;
const StatusIndicatorNominal = styled(StatusIndicatorBase)`
    color: rgb(114, 191, 55);
`;

const MetaStatusIndicator = (props: { metaStore: MetaStore }) => {
    return (
        <BaseStatusIndicator>
            {props.metaStore.serverDown ? (
                <StatusIndicatorDown>
                    Offline (please check connection)!
                </StatusIndicatorDown>
            ) : (
                <StatusIndicatorNominal>Online</StatusIndicatorNominal>
            )}
        </BaseStatusIndicator>
    );
};

export default observer(MetaStatusIndicator);
