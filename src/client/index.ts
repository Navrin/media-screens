export const API_URL =
    process.env.NODE_ENV === "production"
        ? process.env.REACT_APP_DEV_BUILD
            ? "http://10.0.0.128:8000/files"
            : "https://media.bananablossom.com.au/files"
        : "http://localhost:8000/files";
