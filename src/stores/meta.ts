import { API_URL } from "../client";
import { makeObservable, observable } from "mobx";
import * as df from "date-fns";
import { promises as pfs, readSync, readFileSync } from "fs";
import { join } from "path";
import shuffle from "lodash/shuffle";
import { ipcRenderer } from "electron";
// const { app } = require("@electron/remote/main");

interface Manifest {
    stores: string[];
    files: {
        times: string[];
        stores: string[];
        file: string;
    }[];
}

const manifestCache = "manifestCache";
export class MetaStore {
    static screenId: string = `screen-${
        (window.screen as any as { availLeft: number }).availLeft
    }`;

    @observable
    stores: string[] | null = null;
    @observable
    manifest: Manifest | null = null;
    @observable
    selectedStore: string | null = localStorage.getItem(MetaStore.screenId);

    serverDown = false;

    @observable
    rotation: string[] = [];

    intervalHandler: NodeJS.Timer | null = null;
    next: Generator<string, void, unknown>;

    setSelectedStore = (s: string) => {
        this.selectedStore = s;
        localStorage.setItem(MetaStore.screenId, s);
    };

    async getWritePath() {
        const appData = await ipcRenderer.invoke("get-appdata");
        const out = `${appData}/media-desktop/media/files`;
        return out;
    }

    constructor() {
        makeObservable(this);

        let self = this;

        const next = function* () {
            let cur = 0;

            while (true) {
                let now = cur++;
                // console.log(now);

                if (now >= self.rotation.length) {
                    cur = 0;
                    now = 0;
                }

                if (self.rotation.length <= 0) {
                    return undefined;
                }

                yield self.rotation[now];
            }
        };

        this.next = next();

        this.bootStrap();
    }

    bootStrap = async (): Promise<void> => {
        if (navigator.onLine && !this.serverDown) {
            try {
                const manifest = await fetch(`${API_URL}/manifest`).then((r) =>
                    r.json(),
                );

                this.stores = manifest.stores;
                this.manifest = manifest;
                localStorage.setItem(manifestCache, JSON.stringify(manifest));

                this.workLoop();
                this.intervalHandler = setInterval(this.workLoop, 20000);

                // occasionally refresh the manifest too.
                setTimeout(() => {
                    this.intervalHandler && clearInterval(this.intervalHandler);

                    this.bootStrap();
                }, 100000);
            } catch (e) {
                if (
                    e instanceof Error &&
                    e.message.includes("Failed to fetch")
                ) {
                    this.serverDown = true;
                    return this.bootStrap();
                }

                console.error(e);

                setTimeout(() => {
                    this.bootStrap();
                }, 15000);
            }
        } else {
            // offline mode
            // use last known manifest to show correct images.

            this.manifest = JSON.parse(
                localStorage.getItem(manifestCache) || "{}",
            );

            const allowedImages = this.manifest!.files.flatMap((m) =>
                m.stores.includes(this.selectedStore || "") ||
                m.stores.length <= 0
                    ? [m.file]
                    : [],
            );

            // find cached files that are in allowedImages set
            // cached images ∩ allowed images
            const write = await this.getWritePath();
            const cachedFiles = await pfs.readdir(write);

            const files = allowedImages.filter((a) =>
                cachedFiles.some((f) => f.includes(a)),
            );

            this.rotation = files
                .map((f) => join(write, "/", f))
                .map((f) => {
                    return "file://" + f;
                });

            console.debug("rotation is set to ", this.rotation);

            this.intervalHandler && clearInterval(this.intervalHandler);
            // retry internet connection
            // reset server status so it doesn't get permastuck in offline mode
            this.serverDown = false;
            setTimeout(this.bootStrap, 20000);
        }
    };

    workLoop = async () => {
        // console.count("performing workloop");
        if (this.manifest == null) {
            return;
        }

        for (const file of this.manifest.files) {
            // check if file is store limited
            if (file.stores.length > 0) {
                // if file is store limited and this store is not included skip file
                if (!file.stores.includes(this.selectedStore || "")) {
                    continue;
                }
            }

            // check if file is time limited
            if (file.times.length > 0) {
                if (!processTimeIsValid(file.times)) {
                    continue;
                }
            }

            const fileUrl = `${API_URL}/media/${file.file}`;
            // file should be valid, check if already in rotation
            const exists = this.rotation.includes(fileUrl);

            if (exists) {
                continue;
            }

            // file needs to be added to rotation

            this.rotation = shuffle([...this.rotation, fileUrl]);

            // if (!file.file.endsWith("mp4")) {
            //     const img = new Image();
            //     img.src = fileUrl;
            // } else {
            fetch(fileUrl, { cache: "force-cache" });
            // }

            // cache file if general rotation so it can work offline
            const writePath = await this.getWritePath();
            await pfs.mkdir(writePath, { recursive: true });
            const files = await pfs.readdir(writePath);

            // dont cache already added images
            if (files.includes(file.file)) {
                continue;
            }

            const blob = await fetch(fileUrl).then((r) => r.blob());

            let reader = new FileReader();
            reader.onload = function () {
                if (reader.readyState === 2) {
                    var buffer = new Buffer(reader.result as ArrayBuffer);
                    pfs.writeFile(`${writePath}/${file.file}`, buffer);
                }
            };

            reader.readAsArrayBuffer(blob);
        }
    };
}

function dateBetween(date: Date, range: [Date, Date]) {
    return df.isBefore(date, range[1]) && df.isAfter(date, range[0]);
}

function processTimeIsValid([start, end]: string[]) {
    // is a valid date (iso style)
    if (isISODateString(start)) {
        const startDate = new Date(start);
        const endDate = new Date(end);

        const now = new Date();

        if (dateBetween(now, [startDate, endDate])) {
            return true;
        }
    }

    // otherwise, is just a time like 12:30pm

    const now = new Date();

    const range = [start, end].map((r) => df.parse(r, "hh:mm aa", now));

    return dateBetween(now, range as unknown as [Date, Date]);
}

var isoValidDate = new RegExp(
    /(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))/,
);

function isISODateString(date: string | undefined) {
    if (date == null) {
        return false;
    }
    return isoValidDate.test(date);
}
