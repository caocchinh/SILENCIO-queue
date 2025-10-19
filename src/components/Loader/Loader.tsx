"use client";
import styles from "./Loader.module.css";

const Loader = ({ loadingText }: { loadingText?: string }) => {
  return (
    <div className="flex w-full flex-col  items-center justify-center gap-5 bg-transparent ">
      <div
        className={styles.loader}
        style={{ backgroundImage: "transparent" }}
      />
      <p className="text-sm text-gray-500">{loadingText}</p>
    </div>
  );
};

export default Loader;
