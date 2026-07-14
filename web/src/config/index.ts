import { brandName, dashWallpaper, admins, tiers as tiersRaw, paymentMessage, paymentImage } from "./config.json" with { type: 'json' };
export { brandName, dashWallpaper, admins,  paymentMessage, paymentImage };


export const tiers: Tiers = tiersRaw;
export type Tiers = {
        [key: string]: Tier;
}
export interface Limits {
    max_minutes?: number,
    max_photos?: number,
    max_total_size?: number,
    auto_click?: boolean,
}
export interface Tier {
    id: string,
    name: string,
    price: string,
    limits: Limits
}
/*

#[derive(Deserialize, Serialize)]
pub struct User {
    pub auth0_id: String,
}

#[derive(Deserialize, Serialize)]
pub struct Tier {
    pub id: String,
    pub name: String,
    pub limits: Limits,
}#[derive(Deserialize, Serialize)]
pub struct Limits {
    pub max_minutes: Option<u8>,
    pub max_photos: Option<u8>,
    pub max_total_size: Option<usize>,
    pub auto_click: Option<u8>,
}

#[derive(Deserialize, Serialize)]
pub struct Session {
    pub user: User,
    pub id: String,
    pub tier: Tier,
}
*/