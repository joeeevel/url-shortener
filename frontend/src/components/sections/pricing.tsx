"use client";
import Button from "../ui/Button";
import CheckMarkIcon from "@iconify-react/openmoji/check-mark";
import CrossMarkIcon from "@iconify-react/openmoji/cross-mark";

export function Pricing() {
  return (
    <section className="max-w-7xl mx-auto mt-24 flex flex-col items-center justify-center text-center">
      <h2 className="text-4xl font-bold">Pricing Section</h2>
      <div className="grid grid-cols-3 gap-x-4 my-16 max-w-6xl w-full">
        <div className="col-span-3 flex border-b border-gray-1 py-2">
          <h3 className="text-text-dark/0 w-2/5 shrink-0">Foxy</h3>
          <h3 className="text-text-dark text-xl font-medium w-[30%] shrink-0 text-left">
            Free Tier
          </h3>
          <h3 className="text-text-dark text-xl font-medium w-[30%] shrink-0 text-left">
            Private (Recommended)
          </h3>
        </div>
        <div className="col-span-3 flex border-b border-gray-1 py-2">
          <h3 className="text-subhead text-xl font-regular w-2/5 shrink-0 text-left">
            The story
          </h3>
          <h3 className="text-subhead text-xl font-regular w-[30%] shrink-0 text-left">
            "We see your links"
          </h3>
          <h3 className="text-subhead text-xl font-regular w-[30%] shrink-0 text-left">
            "We never see your links"
          </h3>
        </div>
        <div className="col-span-3 flex border-b border-gray-1 py-2">
          <h3 className="text-subhead text-xl font-regular w-2/5 shrink-0 text-left">
            Best for
          </h3>
          <h3 className="text-subhead text-xl font-regular w-[30%] shrink-0 text-left">
            Casual sharing
          </h3>
          <h3 className="text-subhead text-xl font-regular w-[30%] shrink-0 text-left">
            Privacy users
          </h3>
        </div>
        <div className="col-span-3 flex border-b border-gray-1 py-2">
          <h3 className="text-subhead text-xl font-regular w-2/5 shrink-0 text-left">
            Price
          </h3>
          <h3 className="text-subhead text-xl font-regular w-[30%] shrink-0 text-left">
            $0
          </h3>
          <h3 className="text-subhead text-xl font-regular w-[30%] shrink-0 text-left">
            $8/month
          </h3>
        </div>
        <div className="col-span-3 flex border-b border-gray-1 py-2">
          <h3 className="text-subhead text-xl font-regular w-2/5 shrink-0 text-left">
            We see your URL?
          </h3>
          <h3 className="text-subhead text-xl font-regular w-[30%] shrink-0 text-left">
            Yes
          </h3>
          <h3 className="text-subhead text-xl font-regular w-[30%] shrink-0 text-left">
            Never
          </h3>
        </div>
        <div className="col-span-3 flex border-b border-gray-1 py-2">
          <h3 className="text-subhead text-xl font-regular w-2/5 shrink-0 text-left">
            Zero-Knowledge
          </h3>
          <div className="w-[30%] shrink-0 flex justify-start">
            <CrossMarkIcon className="size-8" />
          </div>
          <div className="w-[30%] shrink-0 flex justify-start">
            <CheckMarkIcon className="size-8" />
          </div>
        </div>
        <div className="col-span-3 flex border-b border-gray-1 py-2">
          <h3 className="text-subhead text-xl font-regular w-2/5 shrink-0 text-left">
            Custom Slugs
          </h3>
          <div className="w-[30%] shrink-0 flex justify-start">
            <CrossMarkIcon className="size-8" />
          </div>
          <div className="w-[30%] shrink-0 flex justify-start">
            <CheckMarkIcon className="size-8" />
          </div>
        </div>
      </div>
      {/* Toggle Button */}
      <div className="grid grid-cols-2 bg-gray-1 inset-shadow-sm inset-shadow-black/25 w-125 relative rounded-full p-4 mb-6 ">
        <Button
          variant="primary"
          size="lg"
          className="absolute! top-1/2 -translate-y-1/2 left-4 py-8 w-58.25"
        ></Button>
        <span className="z-5 text-2xl font-bold py-4 px-3 flex items-end justify-center gap-2">
            Start your free trial
        </span>
        <span className="z-5 text-2xl font-bold py-4 px-3 flex items-end justify-center gap-2">
          Try{" "}
          <span>
            <img
              src="./foxy-logo-text.svg"
              className="select-none"
              draggable={false}
              alt="Foxy Text Logo"
            />
          </span>{" "}
          for free
        </span>
      </div>
    </section>
  );
}
