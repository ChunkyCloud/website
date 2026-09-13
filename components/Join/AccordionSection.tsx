import React from "react";

interface Variables {
  Title: string;
  Content: React.ReactNode;
}

const AccordionSection = ({ Title, Content }: Variables) => {
  return (
    <div className="collapse collapse-arrow bg-base-100 border border-base-300">
      <input type="radio" name="my-accordion-2" />
      <div className="collapse-title font-semibold">{Title}</div>
      <div className="collapse-content text-sm">{Content}</div>
    </div>
  );
};

export default AccordionSection;
