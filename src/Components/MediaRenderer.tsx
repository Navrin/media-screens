import React from "react";
import { inject, observer } from "mobx-react";
import { MetaStore } from "../stores/meta";
import styled from "styled-components";
import { when } from "mobx";

type MediaRendererProps = {
    metaStore?: MetaStore;
};

const Container = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100vw;
    height: 100vh;
`;

const CurrentImage = styled.img`
    display: flex;
    justify-content: center;
    align-items: center;
    object-fit: cover;

    width: 100vw;
    height: 100vh;
`;

const Video = styled.video<{ hidden: boolean }>`
    display: ${props => (props.hidden ? "none" : "flex")};
    justify-content: center;
    align-items: center;
    object-fit: cover;

    width: 100vw;
    height: 100vh;
`;

@inject("metaStore")
@observer
class MediaRenderer extends React.Component<
    MediaRendererProps,
    {
        currentMedia: string;
        enqeueVideo: null | string;
        lastPlayedImageMedia: null | string;
    }
> {
    vref: HTMLVideoElement | null = null;

    constructor(props: MediaRendererProps) {
        super(props);

        this.state = {
            currentMedia: props.metaStore!.rotation[0] || "",
            enqeueVideo: null,
            lastPlayedImageMedia: null,
        };

        when(() => this.props.metaStore!.rotation.length > 0).then(() =>
            this.workLoop(),
        );
        setInterval(this.workLoop, 15000);
    }

    workLoop = async () => {
        if (this.shouldPlayVideo()) {
            return;
        }

        const rotation = this.props.metaStore!.rotation;
        if (rotation.length <= 0) {
            return;
        }

        const selection = Math.floor(Math.random() * rotation.length);
        const media = rotation[selection];

        if (this.state.enqeueVideo && this.vref) {
            console.log("checking video state");
            if (this.vref.readyState === 4) {
                this.setState({
                    currentMedia: this.state.enqeueVideo,
                });
            }
        }

        if (media.endsWith("mp4")) {
            // dont queue a video as the last media as its not a fast fallback
            if (this.state.lastPlayedImageMedia == null) {
                console.log("video was first choice");
                this.workLoop();
            }

            console.log("queuing video");
            // handle video loading

            if (!this.state.enqeueVideo) {
                this.setState({
                    enqeueVideo: media,
                });
            }

            this.workLoop();
        }

        if (media === this.state.currentMedia && rotation.length > 1) {
            this.workLoop();
        }

        this.setState({
            lastPlayedImageMedia: this.state.currentMedia.endsWith("mp4")
                ? media
                : this.state.currentMedia || media,
            currentMedia: media,
        });
    };

    render() {
        return (
            <Container>
                {this.state.currentMedia ? (
                    <>
                        {this.state.enqeueVideo && (
                            <Video
                                ref={ref => (this.vref = ref)}
                                hidden={!this.shouldPlayVideo()}
                                autoPlay={true}
                                onEnded={e => {
                                    console.log("video finished");

                                    this.setState({
                                        enqeueVideo: null,
                                        currentMedia: this.state
                                            .lastPlayedImageMedia!,
                                    });
                                }}
                            >
                                <source src={this.state.enqeueVideo}></source>
                            </Video>
                        )}
                        {!this.shouldPlayVideo() && (
                            <CurrentImage src={this.state.currentMedia} />
                        )}
                    </>
                ) : (
                    "Finding media..."
                )}
            </Container>
        );
    }

    private shouldPlayVideo(): boolean | undefined {
        return this.state.currentMedia === this.state.enqeueVideo;
    }
}

export default MediaRenderer;
