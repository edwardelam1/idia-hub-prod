import banner from "@/assets/big-idia-radio-banner.png.asset.json";

const NFTRadioBanner = () => {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("big-idia-radio:open"))}
      aria-label="Open BIG IDIA Radio"
      className="block w-full min-w-0 cursor-pointer border-0 bg-transparent p-0"
    >
      <img
        src={banner.url}
        alt="BIG IDIA Radio — a marketplace for fans and a funding source for artists"
        className="block h-auto max-h-[30dvh] max-w-full object-contain"
      />
    </button>
  );
};

export default NFTRadioBanner;
