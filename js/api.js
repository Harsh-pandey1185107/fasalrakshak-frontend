const LOCAL_HOSTS = new Set([
    "localhost",
    "127.0.0.1"
]);

const API_BASE_URL =
    LOCAL_HOSTS.has(window.location.hostname)
        ? "http://127.0.0.1:8000/api/v1"
        : "https://fasalrakshak-ai-backend.onrender.com/api/v1";


/* ==========================================================================
   TOKEN HELPERS
   ========================================================================== */

function getFarmerToken() {
    return localStorage.getItem("farmer_token");
}


function setFarmerToken(token) {
    localStorage.setItem(
        "farmer_token",
        token
    );
}


function removeFarmerToken() {
    localStorage.removeItem(
        "farmer_token"
    );
}


function getOfficerToken() {
    return localStorage.getItem(
        "officer_token"
    );
}


function setOfficerToken(token) {
    localStorage.setItem(
        "officer_token",
        token
    );
}


function removeOfficerToken() {
    localStorage.removeItem(
        "officer_token"
    );
}


/* ==========================================================================
   GENERIC ERROR HELPER
   ========================================================================== */

async function getErrorMessage(
    response,
    fallbackMessage
) {
    try {
        const errorData =
            await response.json();

        if (
            typeof errorData.detail === "string"
        ) {
            return errorData.detail;
        }

        if (
            Array.isArray(
                errorData.detail
            )
        ) {
            return errorData.detail
                .map(item =>
                    item.msg ||
                    JSON.stringify(item)
                )
                .join(", ");
        }

        if (errorData.message) {
            return errorData.message;
        }

        return fallbackMessage;

    } catch {
        return fallbackMessage;
    }
}


/* ==========================================================================
   FARMER AUTHENTICATION
   ========================================================================== */

async function registerFarmer(
    fullName,
    phone,
    address
) {
    const response = await fetch(
        `${API_BASE_URL}/auth/register`,
        {
            method: "POST",

            headers: {
                "Content-Type":
                    "application/json"
            },

            body: JSON.stringify({
                full_name: fullName,
                phone: phone,
                address: address
            })
        }
    );


    if (!response.ok) {
        const message =
            await getErrorMessage(
                response,
                "Farmer registration failed."
            );

        throw new Error(message);
    }


    const data =
        await response.json();


    if (!data.access_token) {
        throw new Error(
            "Farmer registration succeeded, but no access token was returned."
        );
    }


    setFarmerToken(
        data.access_token
    );


    return data;
}


/* ==========================================================================
   OFFICER LOGIN
   ========================================================================== */

async function loginOfficer(
    username,
    password
) {
    const response = await fetch(
        `${API_BASE_URL}/auth/login`,
        {
            method: "POST",

            headers: {
                "Content-Type":
                    "application/json"
            },

            body: JSON.stringify({
                username: username,
                password: password
            })
        }
    );


    if (!response.ok) {
        const message =
            await getErrorMessage(
                response,
                "Officer login failed."
            );

        throw new Error(message);
    }


    const data =
        await response.json();


    if (!data.access_token) {
        throw new Error(
            "Officer login succeeded, but no access token was returned."
        );
    }


    setOfficerToken(
        data.access_token
    );


    return data;
}


/* ==========================================================================
   FARMER - UPLOAD EVIDENCE
   ========================================================================== */

async function uploadEvidence(
    image,
    latitude,
    longitude,
    description
) {
    const token =
        getFarmerToken();


    if (!token) {
        throw new Error(
            "Farmer is not authenticated."
        );
    }


    const formData =
        new FormData();


    formData.append(
        "image",
        image
    );

    formData.append(
        "latitude",
        latitude
    );

    formData.append(
        "longitude",
        longitude
    );

    formData.append(
        "description",
        description
    );


    const response = await fetch(
        `${API_BASE_URL}/evidence/upload`,
        {
            method: "POST",

            headers: {
                Authorization:
                    `Bearer ${token}`
            },

            body: formData
        }
    );


    if (!response.ok) {
        const message =
            await getErrorMessage(
                response,
                "Evidence upload failed."
            );

        if (
            response.status === 401
        ) {
            removeFarmerToken();
        }

        throw new Error(message);
    }


    return await response.json();
}


/* ==========================================================================
   FARMER - CREATE AI / RAG ASSESSMENT
   ========================================================================== */

async function createAssessment(
    evidenceId
) {
    const token =
        getFarmerToken();


    if (!token) {
        throw new Error(
            "Farmer is not authenticated."
        );
    }


    const response = await fetch(
        `${API_BASE_URL}/assessment/${encodeURIComponent(
            evidenceId
        )}`,
        {
            method: "POST",

            headers: {
                Authorization:
                    `Bearer ${token}`
            }
        }
    );


    if (!response.ok) {
        const message =
            await getErrorMessage(
                response,
                "Assessment failed."
            );

        if (
            response.status === 401
        ) {
            removeFarmerToken();
        }

        throw new Error(message);
    }


    return await response.json();
}


/* ==========================================================================
   FARMER - GET OWN REPORTS
   ========================================================================== */

async function getFarmerReports() {
    const token =
        getFarmerToken();


    if (!token) {
        throw new Error(
            "Farmer is not authenticated."
        );
    }


    const response = await fetch(
        `${API_BASE_URL}/evidence/reports/farmer`,
        {
            method: "GET",

            headers: {
                Authorization:
                    `Bearer ${token}`
            }
        }
    );


    if (!response.ok) {
        const message =
            await getErrorMessage(
                response,
                "Could not load farmer reports."
            );

        if (
            response.status === 401
        ) {
            removeFarmerToken();
        }

        throw new Error(message);
    }


    return await response.json();
}


/* ==========================================================================
   OFFICER - GET ALL REPORTS
   ========================================================================== */

async function getOfficerReports() {
    const token =
        getOfficerToken();


    if (!token) {
        throw new Error(
            "Officer is not authenticated."
        );
    }


    const response = await fetch(
        `${API_BASE_URL}/evidence/reports`,
        {
            method: "GET",

            headers: {
                Authorization:
                    `Bearer ${token}`
            }
        }
    );


    if (!response.ok) {
        const message =
            await getErrorMessage(
                response,
                "Could not load officer reports."
            );

        if (
            response.status === 401
        ) {
            removeOfficerToken();
        }

        throw new Error(message);
    }


    return await response.json();
}


/* ==========================================================================
   OFFICER - GET ONE REPORT
   ========================================================================== */

async function getOfficerReport(
    evidenceId
) {
    const token =
        getOfficerToken();


    if (!token) {
        throw new Error(
            "Officer is not authenticated."
        );
    }


    const response = await fetch(
        `${API_BASE_URL}/evidence/${encodeURIComponent(
            evidenceId
        )}`,
        {
            method: "GET",

            headers: {
                Authorization:
                    `Bearer ${token}`
            }
        }
    );


    if (!response.ok) {
        const message =
            await getErrorMessage(
                response,
                "Could not load report."
            );

        if (
            response.status === 401
        ) {
            removeOfficerToken();
        }

        throw new Error(message);
    }


    return await response.json();
}


/* ==========================================================================
   OFFICER - UPDATE DECISION
   ========================================================================== */

async function updateOfficerDecision(
    evidenceId,
    status,
    remark,
    officerDiagnosis = undefined
) {
    const token =
        getOfficerToken();

    if (!token) {
        throw new Error(
            "Officer is not authenticated."
        );
    }

    const requestBody = {
        status: status,
        officer_remark: remark || ""
    };

    /*
       Only send officer_diagnosis when the caller intentionally supplies it.
       This preserves an existing diagnosis for older frontend callers that
       still use updateOfficerDecision(evidenceId, status, remark).
    */
    if (officerDiagnosis !== undefined) {
        requestBody.officer_diagnosis =
            officerDiagnosis === null
                ? null
                : String(officerDiagnosis);
    }

    const response = await fetch(
        `${API_BASE_URL}/evidence/${encodeURIComponent(
            evidenceId
        )}`,
        {
            method: "PATCH",

            headers: {
                Authorization:
                    `Bearer ${token}`,

                "Content-Type":
                    "application/json"
            },

            body: JSON.stringify(
                requestBody
            )
        }
    );

    if (!response.ok) {
        const message =
            await getErrorMessage(
                response,
                "Officer decision failed."
            );

        if (response.status === 401) {
            removeOfficerToken();
        }

        throw new Error(message);
    }

    return await response.json();
}


/* ==========================================================================
   OFFICER - GET REVIEW HISTORY
   ========================================================================== */

async function getOfficerReviewHistory(
    evidenceId
) {
    const token =
        getOfficerToken();

    if (!token) {
        throw new Error(
            "Officer is not authenticated."
        );
    }

    const response = await fetch(
        `${API_BASE_URL}/evidence/${encodeURIComponent(
            evidenceId
        )}/reviews`,
        {
            method: "GET",

            headers: {
                Authorization:
                    `Bearer ${token}`
            }
        }
    );

    if (!response.ok) {
        const message =
            await getErrorMessage(
                response,
                "Could not load officer review history."
            );

        if (response.status === 401) {
            removeOfficerToken();
        }

        throw new Error(message);
    }

    return await response.json();
}