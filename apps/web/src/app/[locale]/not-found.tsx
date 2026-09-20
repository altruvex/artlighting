"use client";

import { searchProducts } from "@/actions/search";
import type { ProductFamily } from "@repo/catalog/families";
import { serializeRate } from "@repo/money";
import type { MoneyInput } from "@repo/money";
import ProductCard from "@/components/product-card/product-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Contact, Home, Search, ShoppingBag } from "lucide-react";
import { Link } from '@/i18n/navigation';
import { useEffect, useState } from "react";
import { useDebounce } from "use-debounce";
import { useTranslations } from 'next-intl';

interface Product {
  productId: string;
  productName: string;
  Brand: string;
  brand: string;
  price: string;
  productImages: string[];
  sectionType: ProductFamily;
  spotlightType: string;
  discount: string;
  ProductId: string;
  chandelierLightingType: string;
  hNumber: number;
  maximumWattage: string;
  lampBase: string;
  mainMaterial: string;
  beamAngle: string;
}

export default function NotFound() {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  useEffect(() => {
    const performSearch = async () => {
      if (debouncedSearchTerm.trim() === "") {
        setFilteredProducts([]);
        return;
      }
      setIsSearching(true);
      try {
        const results = await searchProducts(debouncedSearchTerm);

        const formattedResults: Product[] = results.map((product): Product => ({
          ...product,
          ProductId: product.productId,
          Brand: product.brand,
          brand: product.brand,
          discount: product.discount ?? serializeRate(0),
          chandelierLightingType: "",
          hNumber: 0,
          maximumWattage: "",
          lampBase: "",
          mainMaterial: "",
          beamAngle: "",
        }));
        setFilteredProducts(formattedResults);
      } catch (error) {
        console.error("Error searching products:", error);
        setFilteredProducts([]);
      } finally {
        setIsSearching(false);
      }
    };
    performSearch();
  }, [debouncedSearchTerm]);
  const t = useTranslations('not-found');
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="grow flex flex-col items-center justify-start pt-16 px-4 md:px-6">
        <div className="w-full space-y-8">
          <h1 className="text-4xl font-extrabold tracking-tight text-center lg:text-5xl">
            {t('title')}
          </h1>
          <p className="text-xl text-center text-muted-foreground">
            {t('description')}
          </p>
          <div className="relative max-w-xl mx-auto ">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground " />
            <Input
              type="search"
              placeholder={t('placeholder')}
              className="pl-10 pr-4 py-4 h-12 w-full text-lg shadow-md rounded-xl border border-input outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {isSearching && (
            <div className="text-center">
              <p className="text-lg text-muted-foreground">Searching...</p>
            </div>
          )}
          {filteredProducts.length > 0 && (
            <Card className="w-full">
              <CardHeader>
                <CardTitle className="text-xl text-primary">Search Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5  gap-6">
                  {filteredProducts.map((product) => (
                    <ProductCard key={product.productId} product={product} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>{t('card-title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 ">
                <Link
                  href="/"
                  className="flex items-center justify-center p-4 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
                >
                  <Home className="mr-2 h-5 w-5" />
                  {t('home-page')}
                </Link>
                <Link
                  href="/category"
                  className="flex items-center justify-center p-4 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
                >
                  <ShoppingBag className="mr-2 h-5 w-5" />
                  {t('all-products')}
                </Link>
                <Link
                  href="/contact-us"
                  className="flex items-center justify-center p-4 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
                >
                  <Contact className="mr-2 h-5 w-5" />
                  {t('contact-us')}
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
