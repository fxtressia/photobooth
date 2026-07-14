# A Photobooth Project
A fun IoT photobooth geared for gigs. This project includes a:
- kiosk software written in Rust using `egui`, `gphoto2`, and Pipewire for the camera box
- fullstack application written in TypeScript, to be deployed via Cloudflare Workers, consisting of two sub-applications:
    - a custom SSR dashboard using React + React Router (SSR logic is written manually instead of using React Router as a framework)
    - a Canva-like SPA application based on [Fabric.js](https://fabricjs.com/) and [Layerhub.io](https://github.com/layerhub.io)

## Setting up
You need to download the ModNET ONNX model for the kiosk application.
```
gdown https://drive.google.com/file/d/1cgycTQlYXpTh26gB9FTnthE7AvruV8hd/view
```

## UX Flow
Before the event, staff will have to configure the system's
- list of events they plan to attend within the duration of the system's operation or list of venues where individual machines will run.
- access pass tiers they choose to offer which can have varying quota or limits based on their prices
- plugins and source code, if they choose to
These things have 

Before or on the day of the event, the user will have to purchase an access pass:
- through the web dashboard by:
    - accessing the service's website,
    - logging into Auth0
    - checking out the tier they'd like to purchase
    - paying for their access pass (At this time, A Photobooth Project does not yet integrate , so users have to upload their proof of payment.) 

On the D-Day of the event, the UX flow is as follows:
- The user pays for the service. Digital payment integration is not implemented in this project, so a staff will have to press "Generate Session" button in the Admin UI, generating a session ID, a unique URL, and a QR Code for the user to access. The session row in the D1's database will have its owner set to null. 
- The user accesses the URL or scans the QR Code (which will also do the former) and logs into Auth0, automatically claiming the session ID as theirs once Auth0 redirected them to our callback URL.
- The user logs into the machine by scanning the QR code presened on the screen. A staff can also remotely log the user into the machine so long as they have logged into Auth0 and claimed their session ID, making the user not have to scan yet another QR code.  
- The user presses a "Start" button, which starts the timer and allows them to access the machine.
    - A "log out" button will appear in this state, allowing other users to log in if the current one runs away from the booth for an emergency.
- The user accesses the machine for a set period of time, which by default is 10 minutes, excluding the time it takes for the system to wait for the camera's shutter to complete. Inside the machine, they can open two apps.
    - The camera app, which will take pictures using gphoto2, upload the web-compressed version of them to Cloudinary, and tell the backend to increase the picture count of the session.
    - The pictures-editing app, which has a user interface similar to Canva, where they they will be able to pick templates, drag and drop all pictures from the current and previous sessions into the frames along with available stickers, and order prints of their photobooth pictures.
        - When they access this app, by default, a design using standard aspect ratio (4:6) will be automatically created. They could also press a "choose an existing design" to edit or duplicate a previous design.
- After leaving the machine, they can log again into the pictures-editing app to continue their progress. Ordering prints will remain available so long as the're an active machine at the moment. Users will have to physically pick the picture the moment they're printed though, so they're have to be present nearby.

Staff will be able to edit the list of events, packages, and more configuration. 

## Configuration
Unfortunately, configuration is still WIP. It is subject to change in the future.

### Cloudflare Workers Web Application
The environment variables needed are as follows:
| Name | Description |
| -- | -- |
| `AUTH0_DOMAIN` | | 
| `AUTH0_CLIENT_ID`| |
| `AUTH0_CLIENT_SECRET` | |
| `APP_BASE_URL` | Base URL of your Workers web application | 
| `PUSHER_APP_ID` | | 
| `PUSHER_APP_KEY` | |
| `PUSHER_APP_SECRET` | |
| `PUSHER_APP_REGION` | |
| `TALLY_WEBHOOK_API_KEY` | |
| `CLOUDINARY_API_KEY` | |
| `CLOUDINARY_API_SECRET` | |
| `CLOUDINARY_CLOUD_NAME` | | 


### Kiosk application
The environment variables needed are as follows:
| Name | Description |
| -- | -- |
| `DISABLE_CAMERA` | This disables gPhoto2 live view and use whatever source Pipewire picks automatically. |
| `PUSHER_WS_HOST` | In the form of `api-{region}.pusher.com` |  
| `PUSHER_WS_KEY` | |
| `CLOUDINARY_CLOUD_NAME` | |
| `CLOUDINARY_PRESET` | |
| `BACKEND_API_HOST` | The public URL of the Worker web application. | 
| `BACKEND_API_KEY` |  |
The best way to set this is in a Bash script that exports your secrets as environmental variables, the way the kiosk application reads the secrets' values.
```sh
# env.sh
export CLOUDINARY_PRESET="my-preset"

# the rest of your secrets here
```

then source it from 
## Copyright
© 2026 Fxtressia - All Rights Reserved.

This project is licensed with GNU AGPLv3. Please read [LICENSE.md](./LICENSE.md) for terms.
