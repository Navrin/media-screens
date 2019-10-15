import { API_URL } from "../client";
import { observable } from "mobx";
import * as df from "date-fns";
import { promises as pfs } from "fs";
const { app } = require("electron").remote;

interface Manifest {
    stores: string[];
    files: {
        times: string[];
        stores: string[];
        file: string;
    }[];
}
export class MetaStore {
    @observable
    stores: string[] | null = null;
    @observable
    manifest: Manifest | null = null;
    @observable
    selectedStore: string | null = localStorage.getItem("store");

    @observable
    rotation: string[] = [];

    intervalHandler: number | null = null;

    setSelectedStore = (s: string) => {
        this.selectedStore = s;
        localStorage.setItem("store", s);
    };

    private readonly writePath =
        app.getPath("appData") + "/media-desktop/media/files";

    constructor() {
        this.bootStrap();
    }

    async bootStrap() {
        if (navigator.onLine) {
            try {
                const manifest = await fetch(`${API_URL}/manifest`).then(r =>
                    r.json(),
                );

                this.stores = manifest.stores;
                this.manifest = manifest;

                this.workLoop();
                this.intervalHandler = setInterval(this.workLoop, 20000);

                // occasionally refresh the manifest too.
                setTimeout(() => {
                    this.intervalHandler && clearInterval(this.intervalHandler);

                    this.bootStrap();
                }, 100000);
            } catch (e) {
                console.error(e);

                setTimeout(() => {
                    this.bootStrap();
                }, 15000);
            }
        } else {
            // offline mode, just play cached images
            const files = await pfs.readdir(this.writePath);

            this.rotation = files;

            this.intervalHandler && clearInterval(this.intervalHandler);
            // retry internet connection
            setTimeout(this.bootStrap, 20000);
        }
    }

    workLoop = async () => {
        console.count("performing workloop");
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

            // file should be valid, check if already in rotation
            const exists = this.rotation.includes(file.file);

            if (exists) {
                continue;
            }

            const fileUrl = `${API_URL}/media/${file.file}`;

            // file needs to be added to rotation
            this.rotation.push(fileUrl);

            if (!file.file.endsWith("mp4")) {
                const img = new Image();
                img.src = fileUrl;
            }

            // cache file if general rotation so it can work offline
            const writePath = this.writePath;
            await pfs.mkdir(writePath, { recursive: true });
            const files = await pfs.readdir(writePath);

            // dont cache already added images
            if (files.includes(file.file)) {
                continue;
            }

            const blob = await fetch(fileUrl).then(r => r.blob());

            let reader = new FileReader();
            reader.onload = function() {
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

    const range = [start, end].map(r => df.parse(r, "hh:mm aa", now));

    return dateBetween(now, (range as unknown) as [Date, Date]);
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
