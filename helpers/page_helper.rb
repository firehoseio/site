module PageHelper
  def link_to_page(page)
    link_to page.data.fetch("title", page.request_path), page.request_path
  end

  def link_to_if_current(text, page, active_class: "active")
    if page == current_page
      link_to text, page.request_path, class: active_class
    else
      link_to text, page.request_path
    end
  end

  # Body classes derived from the current page's path, e.g. "/" => "index",
  # "/v1/" => "v1", "/next/getting-started/" => "next getting-started".
  # Replaces the Middleman `page_classes` helper the layout relied on.
  def page_classes
    segments = current_page.request_path.to_s.split("/").reject(&:empty?)
    segments.empty? ? "index" : segments.join(" ")
  end
end
