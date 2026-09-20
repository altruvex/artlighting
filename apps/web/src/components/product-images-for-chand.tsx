"use client";
import { LegacyProductImage as Image } from "@/components/product-image";
import React from "react";
import { Carousel } from "react-responsive-carousel";
import "react-responsive-carousel/lib/styles/carousel.min.css";

type ProductImagesProps = {
  productImages: string[];
};

export default function ProductImages({ productImages }: ProductImagesProps) {
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const handleSlideChange = (index: number) => {
    setCurrentIndex(index);
  };

  return (
    <div className="relative" dir="ltr">
      <Carousel
        showThumbs={true}
        showStatus={false}
        useKeyboardArrows={true}
        infiniteLoop={false}
        autoPlay={false}
        selectedItem={currentIndex}
        onChange={handleSlideChange}
        renderThumbs={() =>
          productImages.map((img, index) => (
            <div key={index} className="thumbnail-wrapper">
              <Image
                src={img}
                alt={`Thumbnail ${index + 1}`}
                width={64}
                height={64}
                className="object-cover rounded thumbnail-image"
              />
            </div>
          ))
        }
        renderArrowPrev={(onClickHandler, hasPrev, label) =>
          hasPrev && (
            <button
              type="button"
              onClick={onClickHandler}
              title={label}
              className="absolute z-2 w-[35px] h-[35px] left-0 rounded-full bg-gray-50 dark:bg-gray-950 cursor-pointer border-none shadow-md flex items-center justify-center"
              style={{
                top: "calc(50% - 20px)",
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                className="w-6 h-6"
                viewBox="0 0 24 24"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          )
        }
        renderArrowNext={(onClickHandler, hasNext, label) =>
          hasNext && (
            <button
              type="button"
              onClick={onClickHandler}
              title={label}
              className="absolute z-2 w-[35px] h-[35px] right-0 rounded-full bg-gray-50 dark:bg-gray-950 cursor-pointer border-none shadow-md flex items-center justify-center"
              style={{
                top: "calc(50% - 20px)",
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                className="w-6 h-6"
                viewBox="0 0 24 24"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          )
        }
      >
        {productImages.map((img, index) => (
          <div key={index} className="w-full aspect-square">
            <Image
              src={img}
              alt={`Product image ${index + 1}`}
              width={2600}
              height={2600}
              priority
              className="object-cover rounded-lg"
            />
          </div>
        ))}
      </Carousel>
      <style>{`
        .thumbnail-wrapper {
          display: flex;
          justify-content: center;
          align-items: center;
          margin: 4px;
          border: 2px solid transparent;
          cursor: pointer;
          transition: border 0.3s ease;
        }
        .thumbnail-image {
          width: 64px;
          height: 64px;
          object-fit: cover;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
};