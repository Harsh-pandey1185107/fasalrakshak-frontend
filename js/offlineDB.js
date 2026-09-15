/* ==========================================================================
   FasalRakshak AI
   MONIKA ROLE 3 — OFFLINE DATABASE

   IndexedDB responsibilities:
   - Store farmer report drafts
   - Store actual image File/Blob data
   - Store voice recordings
   - Store pending offline submissions
   - Restore evidence after reload
   - Support future automatic synchronization
   ========================================================================== */


const FROfflineDB = {

    databaseName: "FasalRakshakOfflineDB",

    databaseVersion: 1,

    stores: {
        drafts: "drafts",
        submissions: "submissions"
    },

    db: null,


    /* ========================================================================
       OPEN / CREATE DATABASE
       ======================================================================== */

    open() {

        return new Promise(
            (resolve, reject) => {

                if (this.db) {
                    resolve(this.db);
                    return;
                }


                if (!window.indexedDB) {

                    reject(
                        new Error(
                            "IndexedDB is not supported by this browser."
                        )
                    );

                    return;
                }


                const request =
                    indexedDB.open(
                        this.databaseName,
                        this.databaseVersion
                    );


                request.onupgradeneeded =
                    (event) => {

                        const database =
                            event.target.result;


                        /* --------------------------------------------------------------
                           DRAFT STORE
                           -------------------------------------------------------------- */

                        if (
                            !database.objectStoreNames.contains(
                                this.stores.drafts
                            )
                        ) {

                            const draftStore =
                                database.createObjectStore(
                                    this.stores.drafts,
                                    {
                                        keyPath: "id"
                                    }
                                );


                            draftStore.createIndex(
                                "updatedAt",
                                "updatedAt",
                                {
                                    unique: false
                                }
                            );

                        }


                        /* --------------------------------------------------------------
                           SUBMISSION QUEUE STORE
                           -------------------------------------------------------------- */

                        if (
                            !database.objectStoreNames.contains(
                                this.stores.submissions
                            )
                        ) {

                            const submissionStore =
                                database.createObjectStore(
                                    this.stores.submissions,
                                    {
                                        keyPath: "id"
                                    }
                                );


                            submissionStore.createIndex(
                                "syncState",
                                "syncState",
                                {
                                    unique: false
                                }
                            );


                            submissionStore.createIndex(
                                "createdAt",
                                "createdAt",
                                {
                                    unique: false
                                }
                            );

                        }

                    };


                request.onsuccess =
                    (event) => {

                        this.db =
                            event.target.result;


                        this.db.onversionchange =
                            () => {

                                this.db.close();

                                this.db = null;

                            };


                        console.log(
                            "FasalRakshak IndexedDB ready."
                        );


                        resolve(this.db);

                    };


                request.onerror =
                    () => {

                        console.error(
                            "IndexedDB open failed:",
                            request.error
                        );


                        reject(
                            request.error
                        );

                    };


                request.onblocked =
                    () => {

                        console.warn(
                            "IndexedDB upgrade blocked by another open tab."
                        );

                    };

            }
        );

    },


    /* ========================================================================
       GENERIC PUT
       ======================================================================== */

    async put(
        storeName,
        value
    ) {

        const database =
            await this.open();


        return new Promise(
            (resolve, reject) => {

                const transaction =
                    database.transaction(
                        storeName,
                        "readwrite"
                    );


                const store =
                    transaction.objectStore(
                        storeName
                    );


                const request =
                    store.put(value);


                request.onsuccess =
                    () => {

                        resolve(value);

                    };


                request.onerror =
                    () => {

                        reject(
                            request.error
                        );

                    };

            }
        );

    },


    /* ========================================================================
       GENERIC GET
       ======================================================================== */

    async get(
        storeName,
        id
    ) {

        const database =
            await this.open();


        return new Promise(
            (resolve, reject) => {

                const transaction =
                    database.transaction(
                        storeName,
                        "readonly"
                    );


                const store =
                    transaction.objectStore(
                        storeName
                    );


                const request =
                    store.get(id);


                request.onsuccess =
                    () => {

                        resolve(
                            request.result || null
                        );

                    };


                request.onerror =
                    () => {

                        reject(
                            request.error
                        );

                    };

            }
        );

    },


    /* ========================================================================
       GENERIC GET ALL
       ======================================================================== */

    async getAll(
        storeName
    ) {

        const database =
            await this.open();


        return new Promise(
            (resolve, reject) => {

                const transaction =
                    database.transaction(
                        storeName,
                        "readonly"
                    );


                const store =
                    transaction.objectStore(
                        storeName
                    );


                const request =
                    store.getAll();


                request.onsuccess =
                    () => {

                        resolve(
                            request.result || []
                        );

                    };


                request.onerror =
                    () => {

                        reject(
                            request.error
                        );

                    };

            }
        );

    },


    /* ========================================================================
       GENERIC DELETE
       ======================================================================== */

    async delete(
        storeName,
        id
    ) {

        const database =
            await this.open();


        return new Promise(
            (resolve, reject) => {

                const transaction =
                    database.transaction(
                        storeName,
                        "readwrite"
                    );


                const store =
                    transaction.objectStore(
                        storeName
                    );


                const request =
                    store.delete(id);


                request.onsuccess =
                    () => {

                        resolve(true);

                    };


                request.onerror =
                    () => {

                        reject(
                            request.error
                        );

                    };

            }
        );

    },


    /* ========================================================================
       DRAFT FUNCTIONS
       ======================================================================== */

    async saveDraft(
        draft
    ) {

        if (
            !draft ||
            !draft.id
        ) {

            throw new Error(
                "Draft requires an id."
            );

        }


        const record = {

            ...draft,

            updatedAt:
                new Date()
                    .toISOString()

        };


        return this.put(
            this.stores.drafts,
            record
        );

    },


    async getDraft(
        id
    ) {

        return this.get(
            this.stores.drafts,
            id
        );

    },


    async deleteDraft(
        id
    ) {

        return this.delete(
            this.stores.drafts,
            id
        );

    },


    async getAllDrafts() {

        return this.getAll(
            this.stores.drafts
        );

    },


    /* ========================================================================
       OFFLINE SUBMISSION QUEUE
       ======================================================================== */

    async queueSubmission(
        report
    ) {

        if (
            !report ||
            !report.id
        ) {

            throw new Error(
                "Queued report requires an id."
            );

        }


        const queuedReport = {

            ...report,

            syncState:
                "pending",

            syncAttempts:
                report.syncAttempts || 0,

            createdAt:
                report.createdAt ||
                new Date()
                    .toISOString(),

            updatedAt:
                new Date()
                    .toISOString()

        };


        await this.put(
            this.stores.submissions,
            queuedReport
        );


        return queuedReport;

    },


    async getSubmission(
        id
    ) {

        return this.get(
            this.stores.submissions,
            id
        );

    },


    async getAllSubmissions() {

        return this.getAll(
            this.stores.submissions
        );

    },


    async getPendingSubmissions() {

        const submissions =
            await this.getAllSubmissions();


        return submissions.filter(
            (submission) => {

                return (
                    submission.syncState ===
                    "pending" ||

                    submission.syncState ===
                    "failed"
                );

            }
        );

    },


    async updateSyncState(
        id,
        syncState,
        extraData = {}
    ) {

        const report =
            await this.getSubmission(
                id
            );


        if (!report) {

            throw new Error(
                `Submission not found: ${id}`
            );

        }


        const updatedReport = {

            ...report,

            ...extraData,

            syncState,

            updatedAt:
                new Date()
                    .toISOString()

        };


        await this.put(
            this.stores.submissions,
            updatedReport
        );


        return updatedReport;

    },


    async removeSubmission(
        id
    ) {

        return this.delete(
            this.stores.submissions,
            id
        );

    },


    /* ========================================================================
       DATABASE STATUS / DEBUGGING
       ======================================================================== */

    async getStats() {

        const drafts =
            await this.getAllDrafts();


        const submissions =
            await this.getAllSubmissions();


        const pending =
            submissions.filter(
                (item) =>
                    item.syncState ===
                    "pending"
            ).length;


        const failed =
            submissions.filter(
                (item) =>
                    item.syncState ===
                    "failed"
            ).length;


        const synced =
            submissions.filter(
                (item) =>
                    item.syncState ===
                    "synced"
            ).length;


        return {

            drafts:
                drafts.length,

            submissions:
                submissions.length,

            pending,

            failed,

            synced

        };

    },


    /* ========================================================================
       CLEAR DEVELOPMENT DATABASE
  
       Only for development/testing.
       We will NOT expose this as a farmer-facing button.
       ======================================================================== */

    close() {

        if (this.db) {

            this.db.close();

            this.db = null;

        }

    }

};


/* ==========================================================================
   INITIAL DATABASE CHECK
   ========================================================================== */

FROfflineDB
    .open()
    .catch(
        (error) => {

            console.error(
                "Offline database initialization failed:",
                error
            );

        }
    );