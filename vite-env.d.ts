declare module "*.css";
declare module "*.svg";
declare module "*.png";
declare module "*.jpg";
declare module "*.jpeg";

declare var process: {
  env: {
    API_KEY: string;
    [key: string]: string | undefined;
  }
};
