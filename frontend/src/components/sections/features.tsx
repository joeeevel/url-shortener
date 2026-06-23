'use client';

export function Features() {
  const STORY = [
    {
      title: "The Problem",
      description:
        "Other shorteners log your links, track your clicks, and sell your data. Your \"free\" link isn't free. You're the product.",
    },
    {
      title: "The Free Option",
      description:
        "Foxy Free works like any other shortener. We see your URL. It expires in 7 days. Fair for casual use.",
    },
    {
      title: "The Private Option",
      description:
        "Foxy Private is different. Zero-Knowledge means we literally cannot see your link. No logs. No tracking. Your secret stays yours.",
    },
  ];
  return (
    <section className="max-w-7xl mx-auto mt-24 flex flex-col items-center justify-center text-center">
      <h2 className="text-4xl font-bold">
        Every URL shortener sells something. <br /> We sell{" "}
        <span className="text-brand-primary">privacy</span>.
      </h2>
      <div className="grid grid-cols-3 gap-8 mt-16">
        {STORY.map((item, index) => {
          return (
            <div
              key={item.title}
              className="flex flex-col w-full justify-start px-4"
            >
              <h3 className="text-text-dark text-2xl font-medium text-left mb-1.5">
                {item.title}
              </h3>
              <p className="text-subhead text-left text-xl font-normal">{item.description}</p>
            </div>
          );
        })}
        {/* Illustrations/Images */}
        <img
          src="./foxy-track-illustration.webp"
          alt="Foxy Illustration"
          srcSet=""
          className="select-none pointer-event-none col-span-2"
          draggable="false"
        />
        <div className="flex flex-col items-center justify-center gap-4 col-span-1 relative">
          <img
            src="./foxy-private.png"
            alt="Foxy Private Tier"
            srcSet=""
            className="select-none pointer-event-none"
            draggable="false"
          />
          <span className="text-[26px] font-bold px-3 flex items-end justify-center gap-2 absolute bottom-10 left-1/2 -translate-x-1/2 leading-tight">
            <span>
              <img
                src="./foxy-logo-text.svg"
                className="select-none"
                draggable={false}
                alt="Foxy Text Logo"
              />
            </span>{" "}
            Private
          </span>
        </div>
      </div>
        <p className='text-xl font-sf text-subhead'>Free for casual. Private for serious. Both open source.</p>

    </section>
  );
}
