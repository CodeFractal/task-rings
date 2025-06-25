// External libraries loaded at runtime
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const gapi: any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const google: any

interface TokenClient {
    callback: (response: IAccessTokenResponse) => void
    requestAccessToken: () => void
}

interface PickerResponse {
    action: string
    docs: { id: string }[]
}

export class GoogleDriveService {
    private readonly CLIENT_ID = '834406545740-fpa6k2omak75t15u8ve4t7n0t3r1r0ig.apps.googleusercontent.com';
    private readonly API_KEY = 'AIzaSyCMJf3NuTEBASgWaXTQhy6fiM9QY0GAitg';
    private readonly DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];
    private readonly SCOPES = 'https://www.googleapis.com/auth/drive';

    private tokenClient: TokenClient | null = null
    private accessToken: AccessToken | null = null
    private initPromise: Promise<void> | null = null

    constructor() {}

    /**
     * Loads Google API libraries and prepares the token client.
     */
    public init(): Promise<void> {
        if (this.initPromise) return this.initPromise
        this.initPromise = new Promise((resolve, reject) => {
            const waitForGlobals = () => {
                if (typeof gapi === 'undefined' || typeof google === 'undefined') {
                    setTimeout(waitForGlobals, 50)
                    return
                }
                gapi.load('client', async () => {
                    try {
                        await gapi.client.init({
                            apiKey: this.API_KEY,
                            discoveryDocs: this.DISCOVERY_DOCS,
                        })
                        this.tokenClient = google.accounts.oauth2.initTokenClient({
                            client_id: this.CLIENT_ID,
                            scope: this.SCOPES,
                            callback: () => {},
                        }) as TokenClient
                        resolve()
                    } catch (err) {
                        reject(err)
                    }
                })
            }
            waitForGlobals()
        })
        return this.initPromise
    }

    /**
     * Attempts to automatically sign in the user using an existing token.
     * Returns true if sign-in was successful, otherwise false.
     */
    public tryAutoSignIn(): boolean {
        const existingToken = AccessToken.getExisting();
        if (existingToken) {
            this.accessToken = existingToken;
            return true;
        }
        return false;
    }

    /**
     * Prompts the user to sign in with their Google account.
     * Returns a promise that resolves to true if sign-in was successful, otherwise false.
     */
    public async signIn(): Promise<boolean> {
        await this.init()
        return new Promise((resolve, reject) => {
            const tokenClient = this.tokenClient;
            if (!tokenClient) {
                return reject(new Error('Token client not initialized.'))
            }
            // Temporarily override the callback for this sign-in attempt.
            const originalCallback = tokenClient.callback;
            tokenClient.callback = (response: IAccessTokenResponse) => {
                if (response.error) {
                    console.error("Sign-in error:", response.error);
                    resolve(false);
                }
                else {
                    this.accessToken = AccessToken.fromResponse(response);
                    console.log("User signed in, token:", this.accessToken.token);
                    resolve(true);
                }
                // Restore the original callback.
                tokenClient.callback = originalCallback;
            };
            tokenClient.requestAccessToken();
        });
    }

    /**
     * Continuously prompts the user to sign in with their Google account until successful.
     */
    private async getAccessTokenValidFor(seconds: number): Promise<AccessToken> {
        await this.init()
        const currentToken = this.accessToken || AccessToken.getExisting()
        if (currentToken && !currentToken.expiresWithin(seconds)) {
            return currentToken;
        }
        while (true) {
            await this.signIn();
            if (this.accessToken?.expiresWithin(seconds) === false) {
                return this.accessToken;
            }
        }
    }

    /**
     * Prompts the user to select a folder.
     * Returns a promise that resolves to the selected folder (an object with its ID)
     * or null if the user dismisses the modal.
     */
    public async pickFolder(): Promise<string | null> {
        await this.init()
        return new Promise((resolve) => {
            // Load the Picker API.
            gapi.load('picker', async () => {
                const folderView = new google.picker.DocsView(google.picker.ViewId.FOLDERS)
                    .setParent('root')
                    .setMode(google.picker.DocsViewMode.LIST)
                    .setSelectFolderEnabled(true);

                const accessToken = await this.getAccessTokenValidFor(60);
                const picker = new google.picker.PickerBuilder()
                    .addView(folderView)
                    .setOAuthToken(accessToken.token)
                    .setDeveloperKey(this.API_KEY)
                    .setCallback((data: PickerResponse) => {
                        if (data.action === google.picker.Action.PICKED) {
                            const folderId = data.docs[0].id;
                            resolve(folderId);
                        }
                        else if (data.action === google.picker.Action.CANCEL) {
                            resolve(null);
                        }
                    })
                    .build();

                picker.setVisible(true);
            });
        });
    }

    /**
     * Prompts the user to select a file.
     * Returns a promise that resolves to the selected file (an object with its ID)
     * or null if the user dismisses the modal.
     */
    public async pickFile(mimeTypes?: string | string[]): Promise<string | null> {
        await this.init()
        const mimeTypeString = Array.isArray(mimeTypes)
            ? mimeTypes.length > 0
                ? mimeTypes.join(',')
                : undefined
            : mimeTypes

        return new Promise<string | null>((resolve) => {
            // Load the Picker API.
            gapi.load('picker', async () => {
                const fileView = new google.picker.DocsView(google.picker.ViewId.DOCS)
                    .setIncludeFolders(true)
                    .setParent('root')
                    .setMode(google.picker.DocsViewMode.LIST);
    
                if (mimeTypeString) {
                    fileView.setMimeTypes(mimeTypeString);
                }
    
                const accessToken = await this.getAccessTokenValidFor(60);
                const picker = new google.picker.PickerBuilder()
                    .addView(fileView)
                    .setOAuthToken(accessToken.token)
                    .setDeveloperKey(this.API_KEY)
                    .setCallback((data: PickerResponse) => {
                        if (data.action === google.picker.Action.PICKED) {
                            const fileId = data.docs[0].id;
                            resolve(fileId);
                        }
                        else if (data.action === google.picker.Action.CANCEL) {
                            resolve(null);
                        }
                    })
                    .build();
    
                picker.setVisible(true);
            });
        });
    }

    /**
     * Saves the given content as a new file on Google Drive.
     * @param fileName The name of the file to be created
     * @param folderId The ID of the folder where the file should be created
     * @param content The content to be saved in the file
     * @returns The ID of the newly created file, or null if the file could not be created
     */
    public async saveAs(fileName: string, folderId: string, content: string, mimeType?: string): Promise<string | null> {
        await this.init()

        const file = new Blob([content], { type: mimeType })
        const metadata: { name: string; mimeType?: string; parents?: string[] } = {
            name: fileName,
            mimeType,
        }
        if (folderId !== 'root') {
            metadata.parents = [folderId]
        }
        const form = new FormData()
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
        form.append('file', file)

        try {
            const accessToken = await this.getAccessTokenValidFor(20)
            const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
                method: 'POST',
                headers: new Headers({ Authorization: 'Bearer ' + accessToken.token }),
                body: form,
            })
            const result = await res.json()
            return result.id
        } catch (err) {
            console.error('Error creating file:', err)
            return null
        }
    }

    /**
     * Saves the given content to an existing file on Google Drive.
     * @param fileId The ID of the file to be updated
     * @param content The content to be saved in the file
     */
    public async save(fileId: string, content: string, mimeType?: string): Promise<void> {
        await this.init()

        try {
            const accessToken = await this.getAccessTokenValidFor(20)
            await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
                method: 'PATCH',
                headers: new Headers({
                    Authorization: 'Bearer ' + accessToken.token,
                    'Content-Type': mimeType || 'text/plain',
                }),
                body: content,
            })
        } catch (err) {
            console.error('Error saving file:', err)
        }
    }

    /**
     * Retrieves the content of a file from Google Drive.
     * @param fileId The ID of the file to retrieve
     * @returns The content of the file, or null if the file could not be retrieved
     */
    public async open(fileId: string): Promise<string | null> {
        await this.init()

        try {
            const accessToken = await this.getAccessTokenValidFor(20)
            const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
                headers: new Headers({ Authorization: 'Bearer ' + accessToken.token }),
            })
            return await res.text()
        } catch (err) {
            console.error('Error opening file:', err)
            return null
        }
    }
}

class AccessToken {
    private static readonly TOKEN_KEY = 'googleAccessToken';
    private static readonly EXPIRY_KEY = 'googleAccessTokenExpires';

    public static getExisting(): AccessToken | null {
        const token = localStorage.getItem(AccessToken.TOKEN_KEY);
        if (!token) return null;

        const expiry = localStorage.getItem(AccessToken.EXPIRY_KEY);
        if (!expiry) return null;

        try {
            const expires = new Date(expiry);

            // If the token expires in less than 1 minute, don't return it.
            if (expires.getTime() - Date.now() <= 60_000) return null;

            return new AccessToken(token, expires, false);
        }
        catch {
            return null;
        }
    }

    public static fromResponse(response: IAccessTokenResponse): AccessToken {
        if (!response.access_token || !response.expires_in) {
            throw new Error(`Invalid access token response: ${JSON.stringify(response)}`);
        }

        const token = response.access_token;
        const expires = new Date(Date.now() + response.expires_in * 1000);
        return new AccessToken(token, expires, true);
    }

    public readonly token: string;
    public readonly expires: Date;

    private constructor(token: string, expires: Date, autoSave: boolean) {
        this.token = token;
        this.expires = expires;
        if (autoSave) {
            localStorage.setItem(AccessToken.TOKEN_KEY, token);
            localStorage.setItem(AccessToken.EXPIRY_KEY, expires.toISOString());
        }
    }

    public expiresWithin(seconds: number): boolean {
        return this.expires.getTime() - Date.now() <= seconds * 1000;
    }

}

interface IAccessTokenResponse {
    access_token?: string;
    token_type?: string;
    expires_in?: number;
    scope?: string;
    error?: string;
    error_description?: string;
}
