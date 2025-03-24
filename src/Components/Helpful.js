import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../AuthContext";

function Helpful() {
  const { user } = useAuth();
  return (
    <div className="flex flex-col items-center text-center">
      <h1 className="text-2xl font-bold mb-4">Helpful Links</h1>
      <div className="row mt-6">
        <div className="col">
          <h2 className="text-xl font-semibold mb-2">Town Codes</h2>
          <ul className="space-y-2">
            <li>
              <a
                href="https://cms7files.revize.com/riverdalemd/Chapter%2010%20ANIMALS%20AND%20FOWL.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                Town Code - Chapter 10 - Animals and Fowl
              </a>
            </li>
            <li>
              <a
                href="https://cms7files.revize.com/riverdalemd/Chapter%2015%20BUILDING%20CODE.docx(UPDATE).pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                Town Code - Chapter 15 - Building Code
              </a>
            </li>
            <li>
              <a
                href="https://cms7files.revize.com/riverdalemd/Chapter%2027%20DONATION%20BINS.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                Town Code - Chapter 27 - Donation Bins
              </a>
            </li>
            <li>
              <a
                href="https://cms7files.revize.com/riverdalemd/Chapter%2034%20FOOD%20TRUCKS.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                Town Code - Chapter 34 - Food Trucks
              </a>
            </li>
            <li>
              <a
                href="https://cms7files.revize.com/riverdalemd/Chapter%2036%20GARBAGE.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                Town Code - Chapter 36 - Garbage
              </a>
            </li>
            <li>
              <a
                href="https://cms7files.revize.com/riverdalemd/Chapter%2042%20LICENSES.2019.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                Town Code - Chapter 42 - Licenses
              </a>
            </li>
            <li>
              <a
                href="https://cms7files.revize.com/riverdalemd/Chapter%2046%20MUNICIPAL%20INFRACTIONS.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                Town Code - Chapter 46 - Municipal Infractions
              </a>
            </li>
            <li>
              <a
                href="https://cms7files.revize.com/riverdalemd/Chapter%2050%20PEACE%20AND%20GOOD%20ORDER.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                Town Code - Chapter 50 - Good Order
              </a>
            </li>
            <li>
              <a
                href="https://cms7files.revize.com/riverdalemd/Chapter%2055%20RENTAL%20LICENSE%20AND%20INSPECTIONS.pdf(Update).pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                Town Code - Chapter 55 - Rental Licenses and Inspections
              </a>
            </li>
            <li>
              <a
                href="https://cms7files.revize.com/riverdalemd/Chapter%2057%20STREETS%20AND%20SIDEWALKS.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                Town Code - Chapter 57 - Streets and Sidewalks
              </a>
            </li>
            <li>
              <a
                href="https://cms7files.revize.com/riverdalemd/Chapter%2066%20Walls,%20Fences,%20and%20Hedges.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                Town Code - Chapter 66 - Walls, Fences, and Hedges
              </a>
            </li>
            <li>
              <a
                href="https://cms7files.revize.com/riverdalemd/Chapter%2067%20PROPERTY%20MAINTENANCE%20COMBINED.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                Town Code - Chapter 67 - Property Maintenance
              </a>
            </li>
          </ul>
          <h2 className="text-xl font-semibold mt-4 mb-2">Prince George's County</h2>
          <ul className="space-y-2">
            <li>
              <a
                href="https://online.encodeplus.com/regs/princegeorgescounty-md/doc-viewer.aspx#secid-8"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                County Zoning Code
              </a>
            </li>
            <li>
              <a
                href="https://www.pgatlas.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                Prince George's County Atlas
              </a>
            </li>
            <li>
              <a
                href="https://dpiestatus.princegeorgescountymd.gov/Site/Public/Citizens/ActivitySearch.aspx"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                Prince George's County DPIE Status Search
              </a>
            </li>
            <li>
              <a
                href="https://www.princegeorgescountymd.gov/departments-offices/permits/when-permit-required"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                When do you need to have a County Permit?
              </a>
            </li>
          </ul>
          <h2 className="text-xl font-semibold mt-4 mb-2">State</h2>
          <ul className="space-y-2">
            <li>
              <a
                href="https://sdat.dat.maryland.gov/RealProperty/Pages/default.aspx"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                Maryland Department of Assessments and Taxation - Property Search
              </a>
            </li>
            <li>
              <a
                href="https://jportal.mdcourts.gov/license/pbIndex.jsp"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                Maryland Judiciary Business Licenses Online
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default Helpful;
