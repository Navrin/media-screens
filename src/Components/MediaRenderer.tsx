import React from "react";
import { inject, observer } from "mobx-react";
import { MetaStore } from "../stores/meta";
import styled, { keyframes } from "styled-components";
import { when, observable } from "mobx";

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

const FadeIn = keyframes`
    from { opacity: 0;     transform: translate3d(0,0,0); }
    to   { opacity: 1; }
`;

const FadeOut = keyframes`
    from { opacity: 1; }
    to { opacity: 0;     transform: translate3d(0,0,0); }
`;

const CurrentImage = styled.img`
    display: flex;
    justify-content: center;
    align-items: center;
    object-fit: cover;
    animation: ${FadeIn} 2s;
    position: absolute;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
`;

const GhostMediaImg = styled(CurrentImage)<{ hidden: boolean }>`
    animation: ${FadeOut} 1s;
    visibility: ${props => (props.hidden ? "hidden" : "visible")};
    transform: translate3d(0, 0, 0);
`;

const Video = styled.video<{ hidden: boolean }>`
    display: ${props => (props.hidden ? "none" : "flex")};
    justify-content: center;
    align-items: center;
    object-fit: cover;
    animation: ${FadeIn} 1s;
    width: 100vw;
    height: 100vh;
    z-index: 100000;
`;

let timeoutRef: number | null = null;
class GhostMedia extends React.Component<{
    src: string;
    onShouldBeRemoved: () => void;
}> {
    state: { hidden: boolean } = { hidden: false };

    componentDidMount() {
        timeoutRef && window.clearTimeout(timeoutRef);

        this.setState({
            hidden: false,
        });
        timeoutRef = setTimeout(() => {
            this.setState({
                hidden: true,
            });
            this.props.onShouldBeRemoved();
        }, 1000);
    }

    render() {
        return (
            <GhostMediaImg src={this.props.src} hidden={this.state.hidden} />
        );
    }
}

@inject("metaStore")
@observer
class MediaRenderer extends React.Component<MediaRendererProps, {}> {
    vref: HTMLVideoElement | null = null;
    @observable
    videoUrl: string | null = null;
    @observable
    downloading: boolean = false;
    @observable
    currentMedia: string = "";

    skipNextLoop: boolean = false;
    dontPickVideo: boolean = false;
    @observable
    lastMedia: string | null = null;
    frameFallback: string | null = null;

    constructor(props: MediaRendererProps) {
        super(props);

        this.currentMedia = this.props.metaStore!.rotation[0] || "";

        when(() => this.props.metaStore!.rotation.length > 0).then(() =>
            this.workLoop(),
        );

        setInterval(this.workLoop, 15000);
    }

    workLoop = (): void => {
        // dont get new images if its downloading otherwise you get unsightly transitions
        if (this.downloading) {
            return;
        }

        if (this.skipNextLoop) {
            this.skipNextLoop = false;
            return;
        }

        if (this.shouldPlayVideo()) {
            console.log("should play video returned true");
            return;
        }

        const rotation = this.props.metaStore!.rotation;
        if (rotation.length <= 0) {
            return;
        }

        const selection = Math.floor(Math.random() * rotation.length);
        const media = rotation[selection];

        // if (this.state.enqeueVideo && this.vref) {
        //     console.log("checking video state");
        //     if (this.vref.readyState === 4) {
        //         this.setState({
        //             currentMedia: this.state.enqeueVideo,
        //         });
        //     }
        // }

        if (media.endsWith("mp4")) {
            if (this.dontPickVideo) {
                return this.workLoop();
            }

            console.log("queuing video");
            // handle video loading

            this.downloading = true;

            if (this.props.metaStore!.serverDown || !navigator.onLine) {
                this.videoUrl = media;
                this.downloading = false;
                return;
            }

            fetch(media, { cache: "force-cache" })
                .then(r => r.blob())
                .then(b => {
                    this.videoUrl = URL.createObjectURL(b);
                    this.downloading = false;
                });

            return this.workLoop();
        }

        if (media === this.currentMedia && rotation.length > 1) {
            console.log("repeat media choice");
            return this.workLoop();
        }

        this.lastMedia = this.frameFallback || this.currentMedia;
        if (this.frameFallback) {
            this.frameFallback = null;
        }
        this.currentMedia = media;
        this.dontPickVideo = false;
    };

    render() {
        return (
            <Container>
                {this.lastMedia && (
                    <GhostMedia
                        src={this.lastMedia}
                        onShouldBeRemoved={() => {
                            this.lastMedia = null;
                        }}
                    />
                )}
                {this.currentMedia ? (
                    this.shouldPlayVideo() ? (
                        <Video
                            ref={ref => (this.vref = ref)}
                            hidden={!this.shouldPlayVideo()}
                            autoPlay={true}
                            id="main-video"
                            onEnded={e => {
                                console.log("video finished");

                                this.videoCompleted();
                            }}
                        >
                            <source src={this.videoUrl!} />
                        </Video>
                    ) : (
                        <CurrentImage src={this.currentMedia} />
                    )
                ) : (
                    "Finding media..."
                )}
            </Container>
        );
    }

    private shouldPlayVideo(): boolean | undefined {
        return !this.downloading && this.videoUrl != null;
    }

    videoCompleted = () => {
        const video = document.getElementById("main-video") as HTMLVideoElement;

        const canvas = document.createElement("CANVAS") as HTMLCanvasElement;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        canvas.getContext("2d")!.drawImage(video, 0, 0);

        const dataUri = canvas.toDataURL("image/png", 1);

        this.videoUrl = null;
        this.frameFallback = dataUri;
        this.dontPickVideo = true;
        this.workLoop();
        this.skipNextLoop = true;
    };
}

export default MediaRenderer;
