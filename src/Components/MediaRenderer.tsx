import React from "react";
import { inject, observer } from "mobx-react";
import { MetaStore } from "../stores/meta";
import styled, { keyframes } from "styled-components";
import { when, observable, runInAction, computed, makeObservable } from "mobx";
// const ReactCSSTransitionReplace = require("react-css-transition-replace")
//     .default;
import { CSSTransition, SwitchTransition } from "react-transition-group";
// import electronIsDev from "electron-is-dev";
// const Img = require("react-image");

type MediaRendererProps = {
    metaStore?: MetaStore;
};

const Container = styled.div`
    display: flex;
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
    object-fit: scale-down;
    width: 100vw;
    height: 100vh;
    position: absolute;
    top: 0;
    left: 0;
    transform: translateZ(0);
    will-change: opacity;
`;

// const GhostMediaImg = styled(CurrentImage)<{ hidden: boolean }>`
//     animation: ${FadeOut} 2s;
//     visibility: ${props => (props.hidden ? "hidden" : "visible")};
// `;

const StyledVideo = styled.video<{ visible: boolean }>`
    display: ${(props) => (props.visible ? "flex" : "none")};
    /* visibility: ${(props) => (props.visible ? "visible" : "hidden")}; */
    justify-content: center;
    align-items: center;
    object-fit: cover;
    width: 100vw;
    height: 100vh;
    position: absolute;
    top: 0;
    left: 0;
    transform: translateZ(0);
    will-change: opacity;
    background: transparent;
    /* z-index: 999; */
`;

const VideoAbsoluteContainer = styled.div`
    display: flex;
    width: 100vw;
    height: 100vh;
    // z-index at 100 000 is probably overkill...
    z-index: 10;
`;

const VideoPreloadOverlay = styled(CurrentImage)<{ visible: boolean }>`
    position: absolute;
    top: 0;
    left: 0;
    will-change: opacity;
    /* z-index: -1; */
    visibility: ${(props) => (props.visible ? "visible" : "hidden")};
`;

type VideoProps = {
    children: JSX.Element;
    key: string;
    preload: string;
    refCallback: (instance: HTMLVideoElement | null) => void;
    id: string;
    onEnded: (e: any) => void;
    overlaySrc: string;
    isLeaving: boolean;
    didUnmount: () => void;
};

@observer
class VideoRenderer extends React.Component<VideoProps> {
    vidCallback: number | null = null;
    videoRef: HTMLVideoElement | null = null;
    selfRef: HTMLDivElement | null = null;
    @observable
    overlayVisible: boolean = true;
    overlaySrc: string | null = null;
    @observable
    showVideo: boolean = true;

    constructor(props: VideoProps) {
        super(props);
        makeObservable(this);
    }

    onLoadedDataVideo = () => {
        if (this.props.isLeaving) {
            return;
        }

        if (this.videoRef == null)
            return requestAnimationFrame(this.onLoadedDataVideo);
        if (this.selfRef == null)
            return requestAnimationFrame(this.onLoadedDataVideo);

        // console.log(window.getComputedStyle(this.selfRef!.nextElementSibling));

        const sister = document.getElementById("main-video");
        const sisterOpacity = sister
            ? window.getComputedStyle(sister).opacity
            : "0";

        if (sisterOpacity === "0") {
            // ~~delay until second component finished transiting~~
            // not needed since we're checking for sister opacity now
            // but keep a small delay to make the transition not jarring
            // this.overlaySrc && URL.revokeObjectURL(this.overlaySrc);

            this.showVideo = true;
            this.videoRef!.play().then(() => {
                // requestAnimationFrame(this.waitUntilVideoVisible);
            });
            return;
        }
        return requestAnimationFrame(this.onLoadedDataVideo);
    };

    waitUntilVideoVisible = () => {
        if (this.props.isLeaving) {
            return;
        }
        if (this.videoRef == null) {
            return requestAnimationFrame(this.waitUntilVideoVisible);
        }

        const styles = window.getComputedStyle(this.videoRef);

        if (
            styles.display === "flex" &&
            styles.visibility === "visible" &&
            !this.videoRef.paused &&
            styles.opacity === "1" &&
            styles.height != null
        ) {
            setTimeout(() => {
                this.overlayVisible = false;
            }, 0);
            // yeah,
            // weird af you need to wait for the next event polling so you dont do a white flash
            return;
        }

        return requestAnimationFrame(this.waitUntilVideoVisible);
    };

    componentDidMount() {
        // transaction(() => {
        //     this.overlayVisible = true;
        //     this.showVideo = false;
        // });
        requestAnimationFrame(this.onLoadedDataVideo);
    }

    componentDidUpdate() {
        if (this.props.isLeaving) {
            // this.turnOffOverlay();
        }
    }

    // @action.bound
    // turnOffOverlay() {
    //     this.overlayVisible = true;
    //     this.showVideo = false;
    // }

    componentWillUnmount() {
        this.props.didUnmount();
    }

    render() {
        const { children, refCallback, isLeaving, id, ...props } = this.props;

        return (
            <VideoAbsoluteContainer
                id={id}
                key={this.props.key}
                ref={(ref) => (this.selfRef = ref)}
            >
                <StyledVideo
                    visible={true}
                    ref={(el) => {
                        if (el == null) {
                            return;
                        }

                        this.videoRef = el;
                        this.props.refCallback(el);
                    }}
                    {...props}
                >
                    {this.props.children}
                </StyledVideo>
                {/* <VideoPreloadOverlay
                    visible={this.overlayVisible}
                    src={this.props.overlaySrc!}
                /> */}
            </VideoAbsoluteContainer>
        );
    }
}

@observer
class MediaReplaceImage extends React.Component<{
    currentMedia: string;
    id: string;
}> {
    render() {
        if (this.props.currentMedia === "") {
            return null;
        }

        return (
            <CurrentImage
                // decode={false}
                // container={(children: any) => (
                //         {children}
                //         )}
                id={this.props.id}
                src={this.props.currentMedia}
                key={this.props.currentMedia}
            />
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
    downloadingImg: boolean = false;

    @observable
    currentMedia: string = "";

    isLeaving: boolean = false;
    skipNextLoop: boolean = false;
    dontPickVideo: boolean = false;
    frameFallback: string | null = null;
    vidCallback: number | null = null;
    dontAnimate: boolean = false;
    overlaySrc: string | null = null;
    internalVideoRef: VideoRenderer | null = null;

    constructor(props: MediaRendererProps) {
        super(props);
        makeObservable(this);

        if (this.props.metaStore!.rotation.length > 0) {
            this.currentMedia = this.props.metaStore!.rotation[0] || "";
        }

        when(() => this.props.metaStore!.rotation.length > 0).then(() =>
            this.workLoop(),
        );
        // FIXME:
        setInterval(this.workLoop, 20000);
    }

    workLoop = async (shouldLeave: boolean = false): Promise<void> => {
        if (this.skipNextLoop) {
            this.skipNextLoop = false;
            return;
        }

        // dont get new images if its downloading otherwise you get unsightly transitions
        if (this.downloading || this.downloadingImg) {
            return;
        }

        if (this.internalVideoRef != null) {
            // console.log("should play video returned true");
            return;
        }

        if (
            this.props.metaStore!.rotation.length === 1 &&
            this.currentMedia !== ""
        ) {
            // don't bother changing things if there's only a single image in the queue.
            return;
        }

        const rotation = this.props.metaStore!.next;

        const { value: media } = rotation.next();
        if (media == null) {
            return;
        }

        try {
            if (media.endsWith("mp4")) {
                if (this.dontPickVideo || shouldLeave) {
                    return this.workLoop();
                }

                if (this.internalVideoRef != null) {
                    // there's still a video mounted;
                    return;
                }

                // console.log("queuing video");
                // handle video loading

                this.downloading = true;

                if (this.props.metaStore!.serverDown || !navigator.onLine) {
                    if (this.isLeaving) {
                        return;
                    }
                    this.videoUrl && URL.revokeObjectURL(this.videoUrl);
                    this.videoUrl = media;
                    this.downloading = false;
                    return;
                }

                await fetch(media, { cache: "force-cache" })
                    .then((r) => r.blob())
                    .then((b) => {
                        if (this.isLeaving) {
                            return;
                        }
                        const url = URL.createObjectURL(b);

                        runInAction(async () => {
                            this.currentMedia = "";
                            this.isLeaving = false;
                            this.downloading = false;

                            this.videoUrl && URL.revokeObjectURL(this.videoUrl);
                            this.videoUrl = url;
                        });
                    });

                return;
            }

            if (
                media === this.currentMedia &&
                this.props.metaStore!.rotation.length > 1
            ) {
                // console.log("repeat media choice");
                return this.workLoop();
            }

            if (shouldLeave) {
                this.skipNextLoop = true;
            }
            this.downloadingImg = true;

            await fetch(media, { cache: "force-cache" })
                .then((r) => r.blob())
                .then((b) => {
                    this.videoUrl && URL.revokeObjectURL(this.videoUrl!);
                    this.videoUrl = null;
                    runInAction(() => {
                        this.downloadingImg = false;

                        URL.revokeObjectURL(this.currentMedia);
                        this.currentMedia = URL.createObjectURL(b);
                    });
                });

            this.dontPickVideo = false;
        } catch (e) {
            if (e instanceof Error && e.message.includes("Failed to fetch")) {
                // server went down mid-request, bad times.
                // catch and force offline mode
                this.props.metaStore!.serverDown = true;
                await this.props.metaStore!.bootStrap();
                this.downloadingImg = false;
                this.workLoop();
                return;
            }
        }
    };

    @computed
    get currentKey() {
        return this.videoUrl || this.currentMedia;
    }

    render() {
        // console.log(this.videoUrl || this.currentMedia);
        return (
            <Container key="main-container-for-renderer">
                <SwitchTransition mode="in-out">
                    <CSSTransition
                        classNames="cross-fade"
                        timeout={{ enter: 2000, exit: 4000 }}
                        key={this.currentKey}
                    >
                        {this.videoUrl ? (
                            <VideoRenderer
                                didUnmount={() => {}}
                                ref={(ref) => (this.internalVideoRef = ref)}
                                key={this.videoUrl}
                                preload="auto"
                                refCallback={(ref: HTMLVideoElement | null) => {
                                    this.vref = ref;
                                    return;
                                }}
                                isLeaving={this.isLeaving}
                                overlaySrc={this.overlaySrc!}
                                id="main-video"
                                onEnded={(e) => {
                                    this.videoCompleted();
                                }}
                            >
                                <source src={this.videoUrl! + "#t=0.1"} />
                            </VideoRenderer>
                        ) : (
                            <MediaReplaceImage
                                id="main-image"
                                key={this.currentMedia}
                                currentMedia={this.currentMedia}
                            />
                        )}
                    </CSSTransition>
                </SwitchTransition>
                {this.currentMedia == null &&
                    this.videoUrl &&
                    "Finding media..."}
            </Container>
        );
    }

    private shouldPlayVideo(): boolean | undefined {
        return this.videoUrl != null;
    }

    videoCompleted = async () => {
        runInAction(() => {
            this.vidCallback && clearInterval(this.vidCallback);

            this.internalVideoRef = null;
            this.dontPickVideo = true;
            this.workLoop();
            this.skipNextLoop = true;
        });
    };
}

export default MediaRenderer;

function grabCurrentVideoFrame(vid: HTMLVideoElement) {
    const canvas = document.createElement("canvas") as HTMLCanvasElement;

    canvas.width = vid.videoWidth / 2;
    canvas.height = vid.videoHeight / 2;

    canvas
        .getContext("2d", { alpha: false })!
        .drawImage(vid, 0, 0, canvas.width, canvas.height);

    // const dataUri = canvas.toDataURL("image/jpeg", 0.65);
    return new Promise((res, rej) => {
        const blob = canvas.toBlob(
            (blob) => {
                if (blob == null) {
                    return rej(null);
                }

                return res(blob);
            },
            "image/jpeg",
            0.9,
        );
    });
}
