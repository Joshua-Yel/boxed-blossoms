import {defer} from '@shopify/remix-oxygen';
import {useLoaderData, Link} from '@remix-run/react';
import {getPaginationVariables, Image} from '@shopify/hydrogen';
import {PaginatedResourceSection} from '~/components/PaginatedResourceSection';

/**
 * @type {MetaFunction<typeof loader>}
 */
export const meta = () => {
  return [{title: `Hydrogen | Collections`}];
};

/**
 * @param {LoaderFunctionArgs} args
 */
export async function loader(args) {
  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args);

  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);

  return defer({...deferredData, ...criticalData});
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 * @param {LoaderFunctionArgs}
 */
async function loadCriticalData({context, request}) {
  const {storefront} = context;
  const paginationVariables = getPaginationVariables(request, {
    pageBy: 8,
  });

  // Query collections instead of products
  const [{collections}] = await Promise.all([
    storefront.query(COLLECTIONS_QUERY, {
      variables: {...paginationVariables},
    }),
    // Add other queries here, so that they are loaded in parallel
  ]);
  return {collections};
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 * @param {LoaderFunctionArgs}
 */
function loadDeferredData({context}) {
  return {};
}

export default function Collection() {
  /** @type {LoaderReturnData} */
  const {collections} = useLoaderData();

  return (
    <div className="collection">
      <h2 className="collectionPage-title">Collections</h2>
      <PaginatedResourceSection
        connection={collections}
        resourcesClassName="collections-grid"
      >
        {({node: collection, index}) => (
          <CollectionItem
            key={collection.id}
            collection={collection}
            loading={index < 8 ? 'eager' : undefined}
          />
        )}
      </PaginatedResourceSection>
    </div>
  );
}

/**
 * @param {{
 *   collection: CollectionItemFragment;
 *   loading?: 'eager' | 'lazy';
 * }}
 */
function CollectionItem({collection, loading}) {
  const image = collection?.image; // Assuming 'image' is part of the collection object

  return (
  <div className="collection-container">
    <div className="collection-card">
        <Link
          className="collection-item"
          key={collection.id}
          prefetch="intent"
          to={`/collections/${collection.handle}`} // Link to collection detail page
        >
          {image && (
            <div className="collection-image">
              <Image
                alt={collection.title}
                data={image}
                loading={loading}
                // sizes="(min-width: 45em) 400px, 100vw"
                className="collectionPage-image"
              />
            </div>
          )}
          <h4 className="collectionPage-name">{collection.title}</h4>
        </Link>
      </div>
  </div>
  );
}

// Updated GraphQL query to fetch collections (without featuredImage)
const COLLECTIONS_QUERY = `#graphql
  query Collections(
    $country: CountryCode
    $language: LanguageCode
    $first: Int
    $last: Int
    $startCursor: String
    $endCursor: String
  ) @inContext(country: $country, language: $language) {
    collections(first: $first, last: $last, before: $startCursor, after: $endCursor) {
      nodes {
        id
        handle
        title
        image {
          id
          altText
          url
          width
          height
        }
      }
      pageInfo {
        hasPreviousPage
        hasNextPage
        startCursor
        endCursor
      }
    }
  }
`;
